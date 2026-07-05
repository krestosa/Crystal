import type { ProjectFileWatchEvent, ProjectGraphRefreshMode } from "../watching/project-watch.types";
import type { ProjectScanResult } from "../graph/project-graph.types";

export interface ProjectGraphRefreshPlan {
  readonly mode: ProjectGraphRefreshMode;
  readonly rootPath: string;
  readonly events: readonly ProjectFileWatchEvent[];
  readonly reason: string;
  readonly requiresFullRescan: boolean;
}

export interface ProjectGraphRefreshResult {
  readonly rootPath: string;
  readonly mode: ProjectGraphRefreshMode;
  readonly reason: string;
  readonly result: ProjectScanResult;
  readonly refreshedAt: number;
  readonly durationMs: number;
}
