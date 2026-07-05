import { initialProjectPreviewState } from "../project/preview/project-preview-state";
import type { ProjectPreviewState } from "../project/preview/project-preview.types";
import type { AppStateSnapshot, ProjectGraphState } from "./app-state.types";

type AppStateListener = (state: AppStateSnapshot) => void;

const initialProjectGraphState: ProjectGraphState = {
  root: null,
  graph: null,
  scanStatus: "idle",
  issues: [],
  lastScanAt: null,
  lastError: null,
  watcherStatus: "idle",
  cacheStatus: "empty",
  lastWatchEventAt: null,
  lastRefreshAt: null,
  pendingWatchEvents: [],
  refreshMode: "none",
  lastRefreshDurationMs: null,
  cacheVersion: null
};

const initialState: AppStateSnapshot = {
  workspace: { openedPath: null },
  build: { status: "idle", lastError: null },
  ui: { activeMode: "design" },
  projectGraph: initialProjectGraphState,
  preview: initialProjectPreviewState
};

export class AppStateStore {
  private state: AppStateSnapshot = initialState;
  private readonly listeners = new Set<AppStateListener>();

  getSnapshot(): AppStateSnapshot {
    return this.state;
  }

  patch(nextState: Partial<AppStateSnapshot>): void {
    this.state = { ...this.state, ...nextState };
    this.notify();
  }

  patchProjectGraph(nextState: Partial<ProjectGraphState>): void {
    this.state = { ...this.state, projectGraph: { ...this.state.projectGraph, ...nextState } };
    this.notify();
  }

  patchProjectPreview(nextState: Partial<ProjectPreviewState>): void {
    this.state = { ...this.state, preview: { ...this.state.preview, ...nextState } };
    this.notify();
  }

  subscribe(listener: AppStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}

export const appState = new AppStateStore();
