import type { ProjectFileMetadata } from "../files/project-file-metadata.types";
import type { ProjectGraph, ProjectScanIssue } from "../graph/project-graph.types";

export const projectGraphCacheSchemaVersion = "project-graph-cache/v1";
export const crystalCacheVersion = "crystal-phase-1-watch-cache/v1";

export interface ProjectGraphCacheEntry {
  readonly key: string;
  readonly rootPath: string;
  readonly graph: ProjectGraph;
  readonly fileMetadata: readonly ProjectFileMetadata[];
  readonly scannedAt: number;
  readonly savedAt: number;
  readonly schemaVersion: string;
  readonly crystalCacheVersion: string;
  readonly issues: readonly ProjectScanIssue[];
}

export interface ProjectGraphCacheSaveInput {
  readonly rootPath: string;
  readonly graph: ProjectGraph;
  readonly fileMetadata: readonly ProjectFileMetadata[];
  readonly scannedAt: number;
  readonly issues: readonly ProjectScanIssue[];
}

export interface ProjectGraphCache {
  readonly load: (rootPath: string) => ProjectGraphCacheEntry | null;
  readonly save: (input: ProjectGraphCacheSaveInput) => ProjectGraphCacheEntry;
  readonly invalidate: (rootPath: string, reason: string) => void;
  readonly clear: (rootPath?: string) => void;
}

export interface ProjectGraphCacheInvalidation {
  readonly rootPath: string;
  readonly reason: string;
  readonly invalidatedAt: number;
}
