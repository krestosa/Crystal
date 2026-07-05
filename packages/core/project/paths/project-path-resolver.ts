import path from "node:path";
import type { ProjectPath } from "../graph/project-graph.types";

const externalSchemes = ["http:", "https:", "data:", "mailto:", "tel:", "blob:"];

export interface ProjectPathResolution {
  readonly normalizedSpecifier: string;
  readonly isExternal: boolean;
  readonly absolutePath: ProjectPath | null;
  readonly relativePath: ProjectPath | null;
  readonly exists: boolean;
}

export function normalizeProjectPath(value: string): ProjectPath {
  return value.replace(/\\/g, "/");
}

export function resolveProjectPath(input: {
  readonly rootPath: string;
  readonly fromAbsolutePath: string;
  readonly rawSpecifier: string;
  readonly knownRelativePaths: ReadonlySet<string>;
}): ProjectPathResolution {
  const normalizedSpecifier = stripSpecifierDecorators(input.rawSpecifier.trim());
  if (!isLocalProjectSpecifier(normalizedSpecifier)) {
    return { normalizedSpecifier, isExternal: true, absolutePath: null, relativePath: null, exists: false };
  }

  const absolutePath = normalizedSpecifier.startsWith("/")
    ? path.resolve(input.rootPath, `.${normalizedSpecifier}`)
    : path.resolve(path.dirname(input.fromAbsolutePath), normalizedSpecifier);
  const relativePath = normalizeProjectPath(path.relative(input.rootPath, absolutePath));

  return {
    normalizedSpecifier,
    isExternal: false,
    absolutePath: normalizeProjectPath(absolutePath),
    relativePath,
    exists: input.knownRelativePaths.has(relativePath)
  };
}

export function isLocalProjectSpecifier(rawSpecifier: string): boolean {
  const trimmed = rawSpecifier.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return false;
  const scheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.exec(trimmed)?.[0].toLowerCase();
  return !scheme || !externalSchemes.includes(scheme);
}

export function stripSpecifierDecorators(rawSpecifier: string): string {
  return rawSpecifier.split("#")[0]?.split("?")[0]?.trim() ?? "";
}
