import path from "node:path";
import type { ProjectDependency, ProjectPage, ProjectScanResult } from "../graph/project-graph.types";
import { normalizePath, normalizeProjectPreviewRelativePath, resolveProjectPreviewPath } from "./project-preview-path";
import type { ProjectPreviewIssue, ProjectPreviewTarget } from "./project-preview.types";

export interface ProjectPreviewTargetSelection {
  readonly ok: boolean;
  readonly target: ProjectPreviewTarget | null;
  readonly issue: ProjectPreviewIssue | null;
}

export function selectProjectPreviewTarget(scanResult: ProjectScanResult | null, preferredRelativePath: string | null = null): ProjectPreviewTargetSelection {
  if (!scanResult) return fail("no-project-graph", "No Project Graph is available for preview target selection.", null);
  if (scanResult.pages.length === 0) return fail("no-preview-target", "The active project has no detected HTML pages to preview.", null);

  const page = preferredRelativePath ? findPageByRelativePath(scanResult.pages, preferredRelativePath) : chooseDefaultPage(scanResult.pages);
  if (!page) return fail("target-not-in-graph", "Requested preview target is not a page in the active Project Graph.", preferredRelativePath);

  const resolution = resolveProjectPreviewPath(scanResult.rootPath, page.relativePath);
  if (!resolution.ok || !resolution.absolutePath || !resolution.relativePath) return { ok: false, target: null, issue: resolution.issue };

  return {
    ok: true,
    issue: null,
    target: {
      rootPath: scanResult.rootPath,
      absolutePath: resolution.absolutePath,
      relativePath: resolution.relativePath,
      displayName: page.displayName,
      isEntrypoint: page.isEntrypoint,
      dependencies: page.dependencies,
      directDependencyRelativePaths: collectDirectDependencyRelativePaths(scanResult.rootPath, page.dependencies)
    }
  };
}

function chooseDefaultPage(pages: readonly ProjectPage[]): ProjectPage {
  return pages.find((page) => page.isEntrypoint) ?? pages[0];
}

function findPageByRelativePath(pages: readonly ProjectPage[], requestedRelativePath: string): ProjectPage | null {
  const normalized = normalizeProjectPreviewRelativePath(requestedRelativePath);
  if (!normalized.ok) return null;
  return pages.find((page) => normalizePath(page.relativePath) === normalized.relativePath) ?? null;
}

function collectDirectDependencyRelativePaths(rootPath: string, dependencies: readonly ProjectDependency[]): readonly string[] {
  const relativePaths = new Set<string>();
  for (const dependency of dependencies) {
    if (!dependency.resolvedAbsolutePath || dependency.isExternal || dependency.status !== "resolved") continue;
    const relativePath = normalizePath(path.relative(rootPath, dependency.resolvedAbsolutePath));
    if (isProjectRelativePath(relativePath)) relativePaths.add(relativePath);
  }
  return [...relativePaths].sort();
}

function isProjectRelativePath(relativePath: string): boolean {
  return relativePath.length > 0 && relativePath !== ".." && !relativePath.startsWith("../") && !path.isAbsolute(relativePath);
}

function fail(code: ProjectPreviewIssue["code"], message: string, issuePath: string | null): ProjectPreviewTargetSelection {
  return { ok: false, target: null, issue: { code, severity: "error", message, path: issuePath } };
}
