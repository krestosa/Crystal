import type { ProjectGraph, ProjectScanIssue } from "../project/graph/project-graph.types";

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
}

export interface AppStateSnapshot {
  readonly workspace: WorkspaceState;
  readonly build: BuildState;
  readonly ui: UiState;
  readonly projectGraph: ProjectGraphState;
}
