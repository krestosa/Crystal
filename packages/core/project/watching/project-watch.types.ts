import type { ProjectFileKind, ProjectPath } from "../graph/project-graph.types";

export type ProjectFileWatchEventType = "created" | "changed" | "deleted" | "renamed" | "unknown";
export type ProjectRawFileWatchEventType = "created" | "changed" | "deleted" | "renamed" | "change" | "rename" | "unknown";
export type ProjectWatcherStatus = "idle" | "watching" | "refreshing" | "failed" | "stopped";
export type ProjectGraphRefreshMode = "none" | "incremental" | "semi-incremental" | "full";
export type ProjectGraphCacheStatus = "empty" | "loaded" | "saved" | "invalidated" | "failed";

export interface ProjectWatchIssue {
  readonly code: "ignored-path" | "outside-root" | "watcher-error" | "normalize-failed" | "unknown-event";
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

export interface ProjectRawFileWatchEvent {
  readonly type: ProjectRawFileWatchEventType;
  readonly absolutePath: ProjectPath;
  readonly previousAbsolutePath?: ProjectPath;
  readonly timestamp: number;
  readonly reason?: string;
  readonly issue?: ProjectWatchIssue;
}

export interface ProjectFileWatchEvent {
  readonly type: ProjectFileWatchEventType;
  readonly absolutePath: ProjectPath;
  readonly relativePath: ProjectPath;
  readonly previousAbsolutePath?: ProjectPath;
  readonly previousRelativePath?: ProjectPath;
  readonly timestamp: number;
  readonly kind: ProjectFileKind;
  readonly affectsProjectGraph: boolean;
  readonly reason: string | null;
  readonly issue: ProjectWatchIssue | null;
}

export interface ProjectWatchOptions {
  readonly rootPath: ProjectPath;
  readonly ignoredDirectoryNames?: readonly string[];
  readonly ignoredFileNames?: readonly string[];
  readonly ignoredFileExtensions?: readonly string[];
  readonly debounceMs?: number;
  readonly maxBatchSize?: number;
}

export interface ProjectWatchResult {
  readonly accepted: boolean;
  readonly event: ProjectFileWatchEvent | null;
  readonly issue: ProjectWatchIssue | null;
}

export interface ProjectWatchSession {
  readonly id: string;
  readonly rootPath: ProjectPath;
  readonly startedAt: number;
  readonly status: ProjectWatcherStatus;
}

export interface ProjectWatcherState {
  readonly status: ProjectWatcherStatus;
  readonly rootPath: ProjectPath | null;
  readonly sessionId: string | null;
  readonly startedAt: number | null;
  readonly lastWatchEventAt: number | null;
  readonly lastRefreshAt: number | null;
  readonly pendingWatchEvents: readonly ProjectFileWatchEvent[];
  readonly recentWatchEvents: readonly ProjectFileWatchEvent[];
  readonly refreshMode: ProjectGraphRefreshMode;
  readonly lastRefreshDurationMs: number | null;
  readonly cacheStatus: ProjectGraphCacheStatus;
  readonly cacheVersion: string | null;
  readonly lastError: string | null;
}
