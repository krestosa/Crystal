import { NodeFileWatcherAdapter } from "../../../../../packages/adapters/file-watcher/file-watcher.adapter";
import { eventBus } from "../../../../../packages/core/events/event-bus";
import { projectEventTypes } from "../../../../../packages/core/events/project-events";
import { crystalCacheVersion } from "../../../../../packages/core/project/cache/project-graph-cache.types";
import type { ProjectGraphRefreshResult } from "../../../../../packages/core/project/refresh/project-graph-refresh.types";
import { ProjectWatchBatcher } from "../../../../../packages/core/project/watching/project-watch-batcher";
import type { ProjectFileWatchEvent, ProjectWatcherState } from "../../../../../packages/core/project/watching/project-watch.types";
import { appState } from "../../../../../packages/core/state/app-state";
import { getCurrentProjectRoot, getCurrentProjectScanResult, setCurrentProjectScanResult } from "./project-ipc-state";
import { projectGraphCache, projectGraphRefresher } from "./project-services";

const fileWatch = new NodeFileWatcherAdapter();
const recentEvents: ProjectFileWatchEvent[] = [];
const batcher = new ProjectWatchBatcher({ debounceMs: 140, maxBatchSize: 50, onFlush: (events) => { void refreshFromEvents(events); } });

export async function startProjectWatcher(): Promise<ProjectWatcherState> {
  const rootPath = requireProjectRoot();
  const session = await fileWatch.start({ rootPath, debounceMs: 140, maxBatchSize: 50 }, recordFileEvent, recordWatchError);
  appState.patchProjectGraph({ watcherStatus: "watching", root: rootPath, lastError: null });
  eventBus.emit({ type: projectEventTypes.projectWatchStarted, payload: { session }, createdAt: Date.now() });
  return getProjectWatcherState();
}

export async function stopProjectWatcher(): Promise<ProjectWatcherState> {
  const rootPath = getCurrentProjectRoot();
  batcher.clear();
  await fileWatch.stop();
  appState.patchProjectGraph({ watcherStatus: "stopped", pendingWatchEvents: [] });
  eventBus.emit({ type: projectEventTypes.projectWatchStopped, payload: { rootPath }, createdAt: Date.now() });
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

export async function refreshProjectGraphFromRenderer(): Promise<ProjectGraphRefreshResult> {
  const rootPath = requireProjectRoot();
  return refreshFromEvents([{ type: "unknown", absolutePath: rootPath, relativePath: ".", timestamp: Date.now(), kind: "unknown", affectsProjectGraph: true, reason: "Manual refresh requested.", issue: null }]);
}

export function clearProjectGraphCache(): ProjectWatcherState {
  const rootPath = getCurrentProjectRoot();
  if (rootPath) projectGraphCache.clear(rootPath);
  else projectGraphCache.clear();
  appState.patchProjectGraph({ cacheStatus: "invalidated", cacheVersion: crystalCacheVersion });
  eventBus.emit({ type: projectEventTypes.projectGraphCacheInvalidated, payload: { rootPath: rootPath ?? "*", reason: "Project Graph cache cleared." }, createdAt: Date.now() });
  return getProjectWatcherState();
}

function recordFileEvent(event: ProjectFileWatchEvent): void {
  recentEvents.unshift(event);
  recentEvents.splice(20);
  eventBus.emit({ type: projectEventTypes.projectFileChanged, payload: { event }, createdAt: Date.now() });
  batcher.add(event);
  appState.patchProjectGraph({ lastWatchEventAt: event.timestamp, pendingWatchEvents: batcher.getPendingEvents(), watcherStatus: "watching" });
}

function recordWatchError(error: Error): void {
  const rootPath = getCurrentProjectRoot();
  appState.patchProjectGraph({ watcherStatus: "failed", lastError: error.message });
  eventBus.emit({ type: projectEventTypes.projectWatchFailed, payload: { rootPath, error: error.message }, createdAt: Date.now() });
}

async function refreshFromEvents(events: readonly ProjectFileWatchEvent[]): Promise<ProjectGraphRefreshResult> {
  const rootPath = requireProjectRoot();
  appState.patchProjectGraph({ watcherStatus: "refreshing", pendingWatchEvents: events, lastError: null });
  eventBus.emit({ type: projectEventTypes.projectGraphRefreshStarted, payload: { rootPath, events }, createdAt: Date.now() });
  const refresh = await projectGraphRefresher.refresh(rootPath, events, getCurrentProjectScanResult());
  setCurrentProjectScanResult(refresh.result);
  appState.patchProjectGraph({ root: refresh.result.rootPath, graph: refresh.result.graph, scanStatus: "completed", issues: refresh.result.issues, lastScanAt: refresh.result.scannedAt, watcherStatus: fileWatch.getState().status === "watching" ? "watching" : "stopped", cacheStatus: "saved", cacheVersion: crystalCacheVersion, pendingWatchEvents: [], lastRefreshAt: refresh.refreshedAt, refreshMode: refresh.mode, lastRefreshDurationMs: refresh.durationMs, lastError: null });
  eventBus.emit({ type: projectEventTypes.projectGraphRefreshCompleted, payload: { refresh }, createdAt: Date.now() });
  eventBus.emit({ type: projectEventTypes.projectGraphUpdated, payload: { graph: refresh.result.graph, issues: refresh.result.issues }, createdAt: Date.now() });
  eventBus.emit({ type: projectEventTypes.projectGraphCacheSaved, payload: { rootPath: refresh.result.rootPath, cacheVersion: crystalCacheVersion }, createdAt: Date.now() });
  return refresh;
}

function requireProjectRoot(): string {
  const rootPath = getCurrentProjectRoot();
  if (!rootPath) throw new Error("No project root is open.");
  return rootPath;
}
