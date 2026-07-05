import path from "node:path";
import { detectRawProjectDependencies } from "../dependencies/project-dependency-detectors";
import { classifyProjectFile, isBinaryHeavyProjectKind, isProjectTextFileKind } from "../files/project-file-classifier";
import { projectFileKinds } from "../files/project-file-kind.constants";
import { createProjectGraph } from "../graph/project-graph-builder";
import type { ProjectAsset, ProjectDependency, ProjectDependencyStatus, ProjectFile, ProjectFileSystem, ProjectPage, ProjectScanIssue, ProjectScanOptions, ProjectScanResult } from "../graph/project-graph.types";
import { normalizeProjectPath, resolveProjectPath } from "../paths/project-path-resolver";

const defaultIgnoredDirectoryNames = new Set(["node_modules", ".git", "dist", ".cache", ".crystal-cache", ".next", ".nuxt", ".vite"]);
const defaultMaxFiles = 5000;
const defaultMaxFileBytes = 512 * 1024;
const defaultMaxDepth = 32;

export class ProjectScanner {
  constructor(private readonly fileSystem: ProjectFileSystem) {}

  async scan(rootPath: string, options: ProjectScanOptions = {}): Promise<ProjectScanResult> {
    const scannedAt = Date.now();
    const normalizedRootPath = normalizeProjectPath(path.resolve(rootPath));
    const issues: ProjectScanIssue[] = [];
    const files: ProjectFile[] = [];
    await this.walkDirectory(normalizedRootPath, normalizedRootPath, files, issues, {
      ignoredDirectoryNames: new Set(options.ignoredDirectoryNames ?? defaultIgnoredDirectoryNames),
      maxFiles: options.maxFiles ?? defaultMaxFiles,
      maxDepth: options.maxDepth ?? defaultMaxDepth,
      depth: 0
    });

    const knownRelativePaths = new Set(files.map((file) => file.relativePath));
    const dependencies: ProjectDependency[] = [];
    const maxFileBytes = options.maxFileBytes ?? defaultMaxFileBytes;

    for (const file of files) {
      if (!isProjectTextFileKind(file.kind) || file.sizeBytes > maxFileBytes) continue;
      try {
        const content = await this.fileSystem.readTextFile(file.absolutePath, maxFileBytes);
        dependencies.push(...detectRawProjectDependencies(file, content).map((dependency, index) => {
          const resolved = resolveProjectPath({ rootPath: normalizedRootPath, fromAbsolutePath: dependency.fromAbsolutePath, rawSpecifier: dependency.rawSpecifier, knownRelativePaths });
          const status: ProjectDependencyStatus = resolved.isExternal ? "external" : resolved.exists ? "resolved" : "missing";
          return {
            ...dependency,
            id: `${dependency.fromPath}:${index}:${dependency.rawSpecifier}`,
            normalizedSpecifier: resolved.normalizedSpecifier,
            resolvedPath: resolved.relativePath,
            resolvedAbsolutePath: resolved.absolutePath,
            isExternal: resolved.isExternal,
            status
          };
        }));
      } catch (error) {
        issues.push({ code: "file-read-failed", severity: "warning", message: `Could not read ${file.relativePath}: ${getErrorMessage(error)}`, filePath: file.relativePath });
      }
    }

    for (const dependency of dependencies.filter((item) => item.status === "missing")) {
      issues.push({ code: "missing-dependency", severity: "warning", message: `Missing dependency ${dependency.rawSpecifier} referenced by ${dependency.fromPath}`, filePath: dependency.fromPath, dependencySpecifier: dependency.rawSpecifier });
    }

    const assets = detectAssets(files);
    const pages = detectPages(files, dependencies);
    const graph = createProjectGraph({ rootPath: normalizedRootPath, files, pages, assets, dependencies, issues, timestamp: scannedAt });
    return { rootPath: normalizedRootPath, files, pages, assets, dependencies, issues, graph, scannedAt };
  }

  private async walkDirectory(rootPath: string, currentPath: string, files: ProjectFile[], issues: ProjectScanIssue[], context: { readonly ignoredDirectoryNames: ReadonlySet<string>; readonly maxFiles: number; readonly maxDepth: number; readonly depth: number }): Promise<void> {
    if (files.length >= context.maxFiles) {
      issues.push({ code: "scan-limit-reached", severity: "warning", message: `Project scan stopped after ${context.maxFiles} files.`, filePath: null });
      return;
    }
    if (context.depth > context.maxDepth) return;
    const entries = await this.fileSystem.readDirectory(currentPath);
    for (const entry of entries) {
      if (entry.isDirectory) {
        if (shouldIgnoreDirectory(entry.name, context.ignoredDirectoryNames)) continue;
        await this.walkDirectory(rootPath, entry.absolutePath, files, issues, { ...context, depth: context.depth + 1 });
        continue;
      }
      const kind = classifyProjectFile(entry.absolutePath);
      const relativePath = normalizeProjectPath(path.relative(rootPath, entry.absolutePath));
      files.push({ absolutePath: normalizeProjectPath(entry.absolutePath), relativePath, name: entry.name, extension: path.extname(entry.name).toLowerCase(), kind, sizeBytes: entry.sizeBytes, isText: isProjectTextFileKind(kind), isBinaryHeavy: isBinaryHeavyProjectKind(kind), discoveredAt: Date.now() });
      if (files.length >= context.maxFiles) break;
    }
  }
}

function detectAssets(files: readonly ProjectFile[]): ProjectAsset[] {
  return files.map((file) => ({ file, kind: getAssetKind(file) })).filter((asset): asset is ProjectAsset => asset.kind !== null);
}

function getAssetKind(file: ProjectFile): ProjectAsset["kind"] | null {
  if (file.kind === projectFileKinds.image) return "image";
  if (file.kind === projectFileKinds.svg) return "svg";
  if (file.kind === projectFileKinds.font) return "font";
  if (file.kind === projectFileKinds.video) return "video";
  if (file.kind === projectFileKinds.audio) return "audio";
  if (file.kind === projectFileKinds.asset) return "other";
  return null;
}

function detectPages(files: readonly ProjectFile[], dependencies: readonly ProjectDependency[]): ProjectPage[] {
  return files.filter((file) => file.kind === projectFileKinds.html).map((file) => ({ absolutePath: file.absolutePath, relativePath: file.relativePath, displayName: path.basename(file.relativePath) || file.relativePath, isEntrypoint: file.relativePath === "index.html" || file.relativePath.endsWith("/index.html"), dependencies: dependencies.filter((dependency) => dependency.fromPath === file.relativePath) }));
}

function shouldIgnoreDirectory(name: string, ignoredDirectoryNames: ReadonlySet<string>): boolean {
  return ignoredDirectoryNames.has(name) || (name.startsWith(".") && !name.startsWith(".well-known"));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}