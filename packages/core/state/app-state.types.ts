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

export interface AppStateSnapshot {
  readonly workspace: WorkspaceState;
  readonly build: BuildState;
  readonly ui: UiState;
}
