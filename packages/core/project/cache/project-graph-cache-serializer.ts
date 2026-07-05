import { crystalCacheVersion, projectGraphCacheSchemaVersion, type ProjectGraphCacheEntry } from "./project-graph-cache.types";

export function serializeProjectGraphCacheEntry(entry: ProjectGraphCacheEntry): string {
  return JSON.stringify(entry, null, 2);
}

export function deserializeProjectGraphCacheEntry(source: string): ProjectGraphCacheEntry {
  const parsed = JSON.parse(source) as ProjectGraphCacheEntry;
  if (parsed.schemaVersion !== projectGraphCacheSchemaVersion) throw new Error(`Unsupported Project Graph cache schema: ${parsed.schemaVersion}`);
  if (parsed.crystalCacheVersion !== crystalCacheVersion) throw new Error(`Unsupported Crystal cache version: ${parsed.crystalCacheVersion}`);
  return parsed;
}
