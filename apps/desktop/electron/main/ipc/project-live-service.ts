import { NodeFileWatcherAdapter } from "../../../../../packages/adapters/file-watcher/file-watcher.adapter";
import { appState } from "../../../../../packages/core/state/app-state";
import type { ProjectWatcherState } from "../../../../../packages/core/project/watching/project-watch.types";

const fileWatch = new NodeFileWatcherAdapter();

export async function startProjectWatcher(): Promise<ProjectWatcherState> {
  appState.patchProjectGraph({ watcherStatus: "watching" });
  return getProjectWatcherState();
}

export async function stopProjectWatcher(): Promise<ProjectWatcherState> {
  await fileWatch.stop();
  appState.patchProjectGraph({ watcherStatus: "stopped", pendingWatchEvents: [] });
  return getProjectWatcherState();
}

export function getProjectWatcherState(): ProjectWatcherState {
  const graph = appState.getSnapshot().projectGraph;
  return {
    ...fileWatch.getState(),
    status: graph.watcherStatus,
    rootPath: graph.root,
    lastWatchEventAt: graph.lastWatchEventAt,
    lastRefreshAt: graph.lastRefreshAt,
    pendingWatchEvents: graph.pendingWatchEvents,
    recentWatchEvents: [],
    refreshMode: graph.refreshMode,
    lastRefreshDurationMs: graph.lastRefreshDurationMs,
    cacheStatus: graph.cacheStatus,
    cacheVersion: graph.cacheVersion,
    lastError: graph.lastError
  };
}
