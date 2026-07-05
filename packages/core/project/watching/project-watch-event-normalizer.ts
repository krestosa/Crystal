import path from "node:path";
import { classifyProjectFile } from "../files/project-file-classifier";
import { normalizeProjectPath } from "../paths/project-path-resolver";
import { analyzeProjectWatchImpact } from "./project-watch-impact-analyzer";
import type { ProjectFileWatchEvent, ProjectFileWatchEventType, ProjectRawFileWatchEvent, ProjectWatchOptions, ProjectWatchResult } from "./project-watch.types";

const defaultIgnoredDirectoryNames = new Set(["node_modules", ".git", "dist", ".cache", ".crystal-cache", ".next", ".nuxt", ".vite", "coverage"]);
const defaultIgnoredFileNames = new Set([".DS_Store", "Thumbs.db"]);
const defaultIgnoredFileExtensions = new Set([".tmp", ".temp", ".swp"]);

export function normalizeProjectWatchEvent(rawEvent: ProjectRawFileWatchEvent, options: ProjectWatchOptions): ProjectWatchResult {
  const rootPath = normalizeProjectPath(path.resolve(options.rootPath));
  const absolutePath = normalizeProjectPath(path.resolve(rawEvent.absolutePath));
  if (!isInsideRoot(rootPath, absolutePath)) {
    return reject("outside-root", `Watch event path is outside project root: ${absolutePath}`);
  }

  const relativePath = normalizeProjectPath(path.relative(rootPath, absolutePath));
  const ignoredIssue = getIgnoredPathIssue(relativePath, options);
  if (ignoredIssue) return { accepted: false, event: null, issue: ignoredIssue };

  const previousAbsolutePath = rawEvent.previousAbsolutePath ? normalizeProjectPath(path.resolve(rawEvent.previousAbsolutePath)) : undefined;
  const previousRelativePath = previousAbsolutePath && isInsideRoot(rootPath, previousAbsolutePath) ? normalizeProjectPath(path.relative(rootPath, previousAbsolutePath)) : undefined;
  const type = normalizeEventType(rawEvent.type);
  const kind = classifyProjectFile(absolutePath);
  const impact = analyzeProjectWatchImpact({ type, kind, relativePath });

  const event: ProjectFileWatchEvent = {
    type,
    absolutePath,
    relativePath,
    previousAbsolutePath,
    previousRelativePath,
    timestamp: rawEvent.timestamp,
    kind,
    affectsProjectGraph: impact.affectsProjectGraph,
    reason: rawEvent.reason ?? impact.reason,
    issue: rawEvent.issue ?? null
  };
  return { accepted: true, event, issue: null };
}

function normalizeEventType(type: ProjectRawFileWatchEvent["type"]): ProjectFileWatchEventType {
  if (type === "change") return "changed";
  if (type === "rename") return "unknown";
  if (type === "created" || type === "changed" || type === "deleted" || type === "renamed") return type;
  return "unknown";
}

function getIgnoredPathIssue(relativePath: string, options: ProjectWatchOptions): ProjectWatchResult["issue"] {
  const parts = relativePath.split("/").filter(Boolean);
  const ignoredDirectoryNames = new Set([...defaultIgnoredDirectoryNames, ...(options.ignoredDirectoryNames ?? [])]);
  const ignoredFileNames = new Set([...defaultIgnoredFileNames, ...(options.ignoredFileNames ?? [])]);
  const ignoredFileExtensions = new Set([...defaultIgnoredFileExtensions, ...(options.ignoredFileExtensions ?? [])]);
  if (parts.some((part) => ignoredDirectoryNames.has(part))) return { code: "ignored-path", severity: "info", message: `Ignored watch path in ${relativePath}.` };
  const fileName = parts.at(-1) ?? relativePath;
  if (ignoredFileNames.has(fileName) || ignoredFileExtensions.has(path.extname(fileName).toLowerCase())) return { code: "ignored-path", severity: "info", message: `Ignored temporary watch path ${relativePath}.` };
  return null;
}

function isInsideRoot(rootPath: string, absolutePath: string): boolean {
  return absolutePath === rootPath || absolutePath.startsWith(`${rootPath}/`);
}

function reject(code: NonNullable<ProjectWatchResult["issue"]>["code"], message: string): ProjectWatchResult {
  return { accepted: false, event: null, issue: { code, severity: "warning", message } };
}
