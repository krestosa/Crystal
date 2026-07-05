import { createProjectGraphCacheKey } from "./project-graph-cache-key";
import { crystalCacheVersion, projectGraphCacheSchemaVersion, type ProjectGraphCache, type ProjectGraphCacheEntry, type ProjectGraphCacheInvalidation, type ProjectGraphCacheSaveInput } from "./project-graph-cache.types";

export class InMemoryProjectGraphCache implements ProjectGraphCache {
  private readonly entries = new Map<string, ProjectGraphCacheEntry>();
  private readonly invalidations: ProjectGraphCacheInvalidation[] = [];

  load(rootPath: string): ProjectGraphCacheEntry | null {
    return this.entries.get(createProjectGraphCacheKey(rootPath)) ?? null;
  }

  save(input: ProjectGraphCacheSaveInput): ProjectGraphCacheEntry {
    const key = createProjectGraphCacheKey(input.rootPath);
    const entry: ProjectGraphCacheEntry = {
      key,
      rootPath: input.rootPath,
      graph: input.graph,
      fileMetadata: input.fileMetadata,
      scannedAt: input.scannedAt,
      savedAt: Date.now(),
      schemaVersion: projectGraphCacheSchemaVersion,
      crystalCacheVersion,
      issues: input.issues
    };
    this.entries.set(key, entry);
    return entry;
  }

  invalidate(rootPath: string, reason: string): void {
    this.entries.delete(createProjectGraphCacheKey(rootPath));
    this.invalidations.push({ rootPath, reason, invalidatedAt: Date.now() });
  }

  clear(rootPath?: string): void {
    if (rootPath) {
      this.invalidate(rootPath, "Cache cleared for project root.");
      return;
    }
    this.entries.clear();
    this.invalidations.push({ rootPath: "*", reason: "All Project Graph cache entries cleared.", invalidatedAt: Date.now() });
  }

  getInvalidations(): readonly ProjectGraphCacheInvalidation[] {
    return this.invalidations;
  }
}
