import type { ProjectDomSnapshotState } from "../project/dom/project-dom-snapshot.types";
import type { ProjectPreviewState } from "../project/preview/project-preview.types";
import type { ProjectGraph, ProjectScanIssue } from "../project/graph/project-graph.types";
import type { ProjectFileWatchEvent, ProjectGraphCacheStatus, ProjectGraphRefreshMode, ProjectWatcherStatus } from "../project/watching/project-watch.types";

export interface WorkspaceState {
  readonly openedPath: string | null;
}

export interface BuildState {
  readonly status: "idle" | "running" | "failed" | "completed";
  readonly lastError: string | null;
}

export interface UiState {
  readonly activeMode: "design" | "inspector" | "developer";
}

export interface ProjectGraphState {
  readonly root: string | null;
  readonly graph: ProjectGraph | null;
  readonly scanStatus: "idle" | "scanning" | "completed" | "failed";
  readonly issues: readonly ProjectScanIssue[];
  readonly lastScanAt: number | null;
  readonly lastError: string | null;
  readonly watcherStatus: ProjectWatcherStatus;
  readonly cacheStatus: ProjectGraphCacheStatus;
  readonly lastWatchEventAt: number | null;
  readonly lastRefreshAt: number | null;
  readonly pendingWatchEvents: readonly ProjectFileWatchEvent[];
  readonly refreshMode: ProjectGraphRefreshMode;
  readonly lastRefreshDurationMs: number | null;
  readonly cacheVersion: string | null;
}

export interface AppStateSnapshot {
  readonly workspace: WorkspaceState;
  readonly build: BuildState;
  readonly ui: UiState;
  readonly projectGraph: ProjectGraphState;
  readonly preview: ProjectPreviewState;
  readonly domSnapshot: ProjectDomSnapshotState;
}
