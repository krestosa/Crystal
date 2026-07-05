import type { AppStateSnapshot } from "./app-state.types";

type AppStateListener = (state: AppStateSnapshot) => void;

const initialState: AppStateSnapshot = {
  workspace: {
    openedPath: null
  },
  build: {
    status: "idle",
    lastError: null
  },
  ui: {
    activeMode: "design"
  }
};

export class AppStateStore {
  private state: AppStateSnapshot = initialState;
  private readonly listeners = new Set<AppStateListener>();

  getSnapshot(): AppStateSnapshot {
    return this.state;
  }

  patch(nextState: Partial<AppStateSnapshot>): void {
    this.state = {
      ...this.state,
      ...nextState
    };

    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  subscribe(listener: AppStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const appState = new AppStateStore();
