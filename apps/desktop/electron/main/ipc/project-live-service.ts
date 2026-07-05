import { NodeFileWatcherAdapter } from "../../../../../packages/adapters/file-watcher/file-watcher.adapter";
import { appState } from "../../../../../packages/core/state/app-state";
import type { ProjectFileWatchEvent, ProjectWatcherState } from "../../../../../packages/core/project/watching/project-watch.types";
import { getCurrentProjectRoot } from "./project-ipc-state";

const fileWatch = new NodeFileWatcherAdapter();
const recentEvents: ProjectFileWatchEvent[] = [];

export async function startProjectWatcher(): Promise<ProjectWatcherState> {
  const rootPath = requireProjectRoot();
  await fileWatch.start({ rootPath, debounceMs: 140, maxBatchSize: 50 }, recordFileEvent, recordWatchError);
  appState.patchProjectGraph({ watcherStatus: "watching", root: rootPath, lastError: null });
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
    recentWatchEvents: recentEvents,
    refreshMode: graph.refreshMode,
    lastRefreshDurationMs: graph.lastRefreshDurationMs,
    cacheStatus: graph.cacheStatus,
    cacheVersion: graph.cacheVersion,
    lastError: graph.lastError
  };
}

function recordFileEvent(event: ProjectFileWatchEvent): void {
  recentEvents.unshift(event);
  recentEvents.splice(20);
  appState.patchProjectGraph({ lastWatchEventAt: event.timestamp, pendingWatchEvents: [event], watcherStatus: "watching" });
}

function recordWatchError(error: Error): void {
  appState.patchProjectGraph({ watcherStatus: "failed", lastError: error.message });
}

function requireProjectRoot(): string {
  const rootPath = getCurrentProjectRoot();
  if (!rootPath) throw new Error("No project root is open.");
  return rootPath;
}
