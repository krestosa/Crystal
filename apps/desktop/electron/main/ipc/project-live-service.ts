import { BrowserWindow } from "electron";
import { NodeFileWatcherAdapter } from "../../../../../packages/adapters/file-watcher/file-watcher.adapter";
import { eventBus } from "../../../../../packages/core/events/event-bus";
import { projectEventTypes } from "../../../../../packages/core/events/project-events";
import { crystalCacheVersion } from "../../../../../packages/core/project/cache/project-graph-cache.types";
import type { ProjectGraphRefreshResult } from "../../../../../packages/core/project/refresh/project-graph-refresh.types";
import { ProjectWatchBatcher, chooseDominantEvent } from "../../../../../packages/core/project/watching/project-watch-batcher";
import type { ProjectFileWatchEvent, ProjectWatcherState } from "../../../../../packages/core/project/watching/project-watch.types";
import { appState } from "../../../../../packages/core/state/app-state";
import { crystalIpcChannels } from "../../../../../packages/shared/constants/ipc.constants";
import type { ProjectWatcherUpdatePayload } from "../../../../../packages/shared/types/ipc.types";
import { reloadProjectPreviewAfterGraphRefresh } from "../preview/project-preview-service";
import { getCurrentProjectRoot, getCurrentProjectScanResult, setCurrentProjectScanResult } from "./project-ipc-state";
import { projectGraphCache, projectGraphRefresher } from "./project-services";

const fileWatch = new NodeFileWatcherAdapter();
const recentEvents: ProjectFileWatchEvent[] = [];
const queuedRefreshEvents = new Map<string, ProjectFileWatchEvent>();
let refreshInFlight = false;
let queuedRefreshResolvers: RefreshResolver[] = [];
const batcher = new ProjectWatchBatcher({ debounceMs: 140, maxBatchSize: 50, onFlush: (events) => { void requestProjectGraphRefresh(events).catch(() => undefined); } });

interface RefreshResolver {
  readonly resolve: (refresh: ProjectGraphRefreshResult) => void;
  readonly reject: (error: unknown) => void;
}

export async function startProjectWatcher(): Promise<ProjectWatcherState> {
  const rootPath = requireProjectRoot();
  const session = await fileWatch.start({ rootPath, debounceMs: 140, maxBatchSize: 50 }, recordFileEvent, recordWatchError);
  appState.patchProjectGraph({ watcherStatus: "watching", root: rootPath, lastError: null });
  eventBus.emit({ type: projectEventTypes.projectWatchStarted, payload: { session }, createdAt: Date.now() });
  notifyProjectRenderer();
  return getProjectWatcherState();
}

export async function stopProjectWatcher(): Promise<ProjectWatcherState> {
  const rootPath = getCurrentProjectRoot();
  batcher.clear();
  queuedRefreshEvents.clear();
  rejectQueuedRefreshes(new Error("Project watcher stopped before queued refresh completed."));
  await fileWatch.stop();
  appState.patchProjectGraph({ watcherStatus: "stopped", pendingWatchEvents: [] });
  eventBus.emit({ type: projectEventTypes.projectWatchStopped, payload: { rootPath }, createdAt: Date.now() });
  notifyProjectRenderer();
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
  return requestProjectGraphRefresh([{ type: "unknown", absolutePath: rootPath, relativePath: ".", timestamp: Date.now(), kind: "unknown", affectsProjectGraph: true, reason: "Manual refresh requested.", issue: null }]);
}

export function clearProjectGraphCache(): ProjectWatcherState {
  const rootPath = getCurrentProjectRoot();
  if (rootPath) projectGraphCache.clear(rootPath);
  else projectGraphCache.clear();
  appState.patchProjectGraph({ cacheStatus: "invalidated", cacheVersion: crystalCacheVersion });
  eventBus.emit({ type: projectEventTypes.projectGraphCacheInvalidated, payload: { rootPath: rootPath ?? "*", reason: "Project Graph cache cleared." }, createdAt: Date.now() });
  notifyProjectRenderer();
  return getProjectWatcherState();
}

function recordFileEvent(event: ProjectFileWatchEvent): void {
  recentEvents.unshift(event);
  recentEvents.splice(20);
  eventBus.emit({ type: projectEventTypes.projectFileChanged, payload: { event }, createdAt: Date.now() });
  batcher.add(event);
  appState.patchProjectGraph({ lastWatchEventAt: event.timestamp, pendingWatchEvents: getPendingRefreshEvents(), watcherStatus: refreshInFlight ? "refreshing" : "watching" });
  notifyProjectRenderer();
}

function recordWatchError(error: Error): void {
  const rootPath = getCurrentProjectRoot();
  appState.patchProjectGraph({ watcherStatus: "failed", lastError: error.message });
  eventBus.emit({ type: projectEventTypes.projectWatchFailed, payload: { rootPath, error: error.message }, createdAt: Date.now() });
  notifyProjectRenderer();
}

function requestProjectGraphRefresh(events: readonly ProjectFileWatchEvent[]): Promise<ProjectGraphRefreshResult> {
  const relevantEvents = events.filter((event) => event.affectsProjectGraph);
  if (relevantEvents.length === 0) return resolveNoopRefresh();

  queueRefreshEvents(relevantEvents);
  appState.patchProjectGraph({ watcherStatus: "refreshing", pendingWatchEvents: getPendingRefreshEvents(), lastError: null });
  notifyProjectRenderer();

  const refresh = new Promise<ProjectGraphRefreshResult>((resolve, reject) => {
    queuedRefreshResolvers.push({ resolve, reject });
  });
  if (!refreshInFlight) void drainRefreshQueue();
  return refresh;
}

async function drainRefreshQueue(): Promise<void> {
  if (refreshInFlight) return;
  refreshInFlight = true;
  try {
    while (queuedRefreshEvents.size > 0) {
      const events = takeQueuedRefreshEvents();
      const resolvers = queuedRefreshResolvers.splice(0);
      try {
        const refresh = await refreshFromEvents(events);
        for (const resolver of resolvers) resolver.resolve(refresh);
      } catch (error) {
        for (const resolver of resolvers) resolver.reject(error);
      }
    }
  } finally {
    refreshInFlight = false;
    if (queuedRefreshEvents.size > 0) void drainRefreshQueue();
  }
}

async function refreshFromEvents(events: readonly ProjectFileWatchEvent[]): Promise<ProjectGraphRefreshResult> {
  const rootPath = requireProjectRoot();
  appState.patchProjectGraph({ watcherStatus: "refreshing", pendingWatchEvents: events, lastError: null });
  notifyProjectRenderer();
  eventBus.emit({ type: projectEventTypes.projectGraphRefreshStarted, payload: { rootPath, events }, createdAt: Date.now() });
  try {
    const refresh = await projectGraphRefresher.refresh(rootPath, events, getCurrentProjectScanResult());
    setCurrentProjectScanResult(refresh.result);
    appState.patchProjectGraph({ root: refresh.result.rootPath, graph: refresh.result.graph, scanStatus: "completed", issues: refresh.result.issues, lastScanAt: refresh.result.scannedAt, watcherStatus: fileWatch.getState().status === "watching" ? "watching" : "stopped", cacheStatus: "saved", cacheVersion: crystalCacheVersion, pendingWatchEvents: getPendingRefreshEvents(), lastRefreshAt: refresh.refreshedAt, refreshMode: refresh.mode, lastRefreshDurationMs: refresh.durationMs, lastError: null });
    eventBus.emit({ type: projectEventTypes.projectGraphRefreshCompleted, payload: { refresh }, createdAt: Date.now() });
    eventBus.emit({ type: projectEventTypes.projectGraphUpdated, payload: { graph: refresh.result.graph, issues: refresh.result.issues }, createdAt: Date.now() });
    eventBus.emit({ type: projectEventTypes.projectGraphCacheSaved, payload: { rootPath: refresh.result.rootPath, cacheVersion: crystalCacheVersion }, createdAt: Date.now() });
    notifyProjectRenderer(refresh);
    void reloadProjectPreviewAfterGraphRefresh(events, refresh).catch(() => undefined);
    return refresh;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appState.patchProjectGraph({ watcherStatus: "failed", pendingWatchEvents: getPendingRefreshEvents(), lastError: message });
    eventBus.emit({ type: projectEventTypes.projectGraphRefreshFailed, payload: { rootPath, error: message }, createdAt: Date.now() });
    notifyProjectRenderer();
    throw error;
  }
}

function queueRefreshEvents(events: readonly ProjectFileWatchEvent[]): void {
  for (const event of events) {
    const key = getRefreshEventKey(event);
    const previous = queuedRefreshEvents.get(key);
    queuedRefreshEvents.set(key, previous ? chooseDominantEvent(previous, event) : event);
  }
}

function takeQueuedRefreshEvents(): readonly ProjectFileWatchEvent[] {
  const events = [...queuedRefreshEvents.values()].sort((a, b) => a.timestamp - b.timestamp || a.relativePath.localeCompare(b.relativePath));
  queuedRefreshEvents.clear();
  return events;
}

function getPendingRefreshEvents(): readonly ProjectFileWatchEvent[] {
  return [...batcher.getPendingEvents(), ...queuedRefreshEvents.values()];
}

function getRefreshEventKey(event: ProjectFileWatchEvent): string {
  return event.previousRelativePath ? `${event.previousRelativePath}->${event.relativePath}` : event.relativePath;
}

function rejectQueuedRefreshes(error: Error): void {
  const resolvers = queuedRefreshResolvers.splice(0);
  for (const resolver of resolvers) resolver.reject(error);
}

function resolveNoopRefresh(): Promise<ProjectGraphRefreshResult> {
  const rootPath = requireProjectRoot();
  const currentResult = getCurrentProjectScanResult();
  if (!currentResult) return Promise.reject(new Error("No Project Graph is available to refresh."));
  return Promise.resolve({ rootPath, mode: "none", reason: "No graph-relevant watch events.", result: currentResult, refreshedAt: Date.now(), durationMs: 0 });
}

function notifyProjectRenderer(refresh: ProjectGraphRefreshResult | null = null): void {
  const payload: ProjectWatcherUpdatePayload = { watcherState: getProjectWatcherState(), refresh };
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    if (!browserWindow.isDestroyed()) browserWindow.webContents.send(crystalIpcChannels.projectWatcherUpdated, payload);
  }
}

function requireProjectRoot(): string {
  const rootPath = getCurrentProjectRoot();
  if (!rootPath) throw new Error("No project root is open.");
  return rootPath;
}
