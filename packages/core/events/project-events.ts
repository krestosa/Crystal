import type { ProjectDependency, ProjectFile, ProjectGraph, ProjectScanIssue, ProjectScanResult } from "../project/graph/project-graph.types";
import type { ProjectGraphRefreshResult } from "../project/refresh/project-graph-refresh.types";
import type { ProjectFileWatchEvent, ProjectWatchSession } from "../project/watching/project-watch.types";
import type { CrystalEvent } from "./event.types";

export const projectEventTypes = {
  projectOpened: "ProjectOpened",
  projectScanStarted: "ProjectScanStarted",
  projectScanCompleted: "ProjectScanCompleted",
  projectScanFailed: "ProjectScanFailed",
  projectGraphUpdated: "ProjectGraphUpdated",
  projectFileDiscovered: "ProjectFileDiscovered",
  projectDependencyMissing: "ProjectDependencyMissing",
  projectWatchStarted: "ProjectWatchStarted",
  projectWatchStopped: "ProjectWatchStopped",
  projectWatchFailed: "ProjectWatchFailed",
  projectFileChanged: "ProjectFileChanged",
  projectGraphRefreshStarted: "ProjectGraphRefreshStarted",
  projectGraphRefreshCompleted: "ProjectGraphRefreshCompleted",
  projectGraphRefreshFailed: "ProjectGraphRefreshFailed",
  projectGraphCacheLoaded: "ProjectGraphCacheLoaded",
  projectGraphCacheSaved: "ProjectGraphCacheSaved",
  projectGraphCacheInvalidated: "ProjectGraphCacheInvalidated"
} as const;

export type ProjectOpenedEvent = CrystalEvent<{ readonly rootPath: string }> & { readonly type: "ProjectOpened" };
export type ProjectScanStartedEvent = CrystalEvent<{ readonly rootPath: string }> & { readonly type: "ProjectScanStarted" };
export type ProjectScanCompletedEvent = CrystalEvent<{ readonly result: ProjectScanResult }> & { readonly type: "ProjectScanCompleted" };
export type ProjectScanFailedEvent = CrystalEvent<{ readonly rootPath: string; readonly error: string }> & { readonly type: "ProjectScanFailed" };
export type ProjectGraphUpdatedEvent = CrystalEvent<{ readonly graph: ProjectGraph; readonly issues: readonly ProjectScanIssue[] }> & { readonly type: "ProjectGraphUpdated" };
export type ProjectFileDiscoveredEvent = CrystalEvent<{ readonly file: ProjectFile }> & { readonly type: "ProjectFileDiscovered" };
export type ProjectDependencyMissingEvent = CrystalEvent<{ readonly dependency: ProjectDependency }> & { readonly type: "ProjectDependencyMissing" };
export type ProjectWatchStartedEvent = CrystalEvent<{ readonly session: ProjectWatchSession }> & { readonly type: "ProjectWatchStarted" };
export type ProjectWatchStoppedEvent = CrystalEvent<{ readonly rootPath: string | null }> & { readonly type: "ProjectWatchStopped" };
export type ProjectWatchFailedEvent = CrystalEvent<{ readonly rootPath: string | null; readonly error: string }> & { readonly type: "ProjectWatchFailed" };
export type ProjectFileChangedEvent = CrystalEvent<{ readonly event: ProjectFileWatchEvent }> & { readonly type: "ProjectFileChanged" };
export type ProjectGraphRefreshStartedEvent = CrystalEvent<{ readonly rootPath: string; readonly events: readonly ProjectFileWatchEvent[] }> & { readonly type: "ProjectGraphRefreshStarted" };
export type ProjectGraphRefreshCompletedEvent = CrystalEvent<{ readonly refresh: ProjectGraphRefreshResult }> & { readonly type: "ProjectGraphRefreshCompleted" };
export type ProjectGraphRefreshFailedEvent = CrystalEvent<{ readonly rootPath: string; readonly error: string }> & { readonly type: "ProjectGraphRefreshFailed" };
export type ProjectGraphCacheLoadedEvent = CrystalEvent<{ readonly rootPath: string }> & { readonly type: "ProjectGraphCacheLoaded" };
export type ProjectGraphCacheSavedEvent = CrystalEvent<{ readonly rootPath: string; readonly cacheVersion: string }> & { readonly type: "ProjectGraphCacheSaved" };
export type ProjectGraphCacheInvalidatedEvent = CrystalEvent<{ readonly rootPath: string; readonly reason: string }> & { readonly type: "ProjectGraphCacheInvalidated" };
