import path from "node:path";
import { normalizeProjectPath } from "../paths/project-path-resolver";

export function createProjectGraphCacheKey(rootPath: string): string {
  const normalized = normalizeProjectPath(path.resolve(rootPath)).toLowerCase();
  return `project-graph:${hashString(normalized)}`;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
