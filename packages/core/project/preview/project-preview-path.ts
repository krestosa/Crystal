import path from "node:path";
import { createProjectPreviewIssue } from "./project-preview-issues";
import type { ProjectPreviewIssue, ProjectPreviewPathResolution } from "./project-preview.types";

const windowsDrivePathPattern = /^[a-zA-Z]:[\\/]/;

export function resolveProjectPreviewPath(rootPath: string, requestedRelativePath: string): ProjectPreviewPathResolution {
  const normalizedRequest = normalizeProjectPreviewRelativePath(requestedRelativePath);
  if (!normalizedRequest.ok) return { ok: false, rootPath, relativePath: null, absolutePath: null, issue: normalizedRequest.issue };

  const absolutePath = path.resolve(rootPath, normalizedRequest.relativePath);
  const relativeFromRoot = path.relative(rootPath, absolutePath);

  if (isOutsideProjectRoot(relativeFromRoot)) {
    return {
      ok: false,
      rootPath,
      relativePath: normalizedRequest.relativePath,
      absolutePath,
      issue: createIssue("outside-project-root", "Preview path resolves outside the active project root.", normalizedRequest.relativePath)
    };
  }

  return { ok: true, rootPath, relativePath: normalizePath(relativeFromRoot), absolutePath, issue: null };
}

export function normalizeProjectPreviewRelativePath(requestedRelativePath: string): { readonly ok: true; readonly relativePath: string; readonly issue: null } | { readonly ok: false; readonly relativePath: null; readonly issue: ProjectPreviewIssue } {
  if (typeof requestedRelativePath !== "string" || requestedRelativePath.trim().length === 0 || requestedRelativePath.includes("\0")) {
    return { ok: false, relativePath: null, issue: createIssue("invalid-preview-path", "Preview path is empty or invalid.", null) };
  }

  const normalizedSeparators = requestedRelativePath.replace(/\\/g, "/");
  if (normalizedSeparators.startsWith("/") || normalizedSeparators.startsWith("//") || windowsDrivePathPattern.test(normalizedSeparators)) {
    return { ok: false, relativePath: null, issue: createIssue("invalid-preview-path", "Preview path must be project-relative, not absolute.", requestedRelativePath) };
  }

  const normalizedPath = path.posix.normalize(normalizedSeparators);
  if (normalizedPath === "." || normalizedPath === ".." || normalizedPath.startsWith("../")) {
    return { ok: false, relativePath: null, issue: createIssue("path-traversal", "Preview path cannot traverse outside the project root.", requestedRelativePath) };
  }

  return { ok: true, relativePath: normalizedPath, issue: null };
}

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function isOutsideProjectRoot(relativeFromRoot: string): boolean {
  return relativeFromRoot === "" || relativeFromRoot === ".." || relativeFromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeFromRoot);
}

function createIssue(code: ProjectPreviewIssue["code"], message: string, issuePath: string | null): ProjectPreviewIssue {
  return createProjectPreviewIssue({ code, message, path: issuePath, source: "target" });
}
