import type { ProjectGraph, ProjectScanResult } from "../../core/project/graph/project-graph.types";
import type { ProjectGraphRefreshResult } from "../../core/project/refresh/project-graph-refresh.types";
import type { ProjectWatcherState } from "../../core/project/watching/project-watch.types";
import type { crystalIpcChannels } from "../constants/ipc.constants";

export type CrystalIpcChannel = typeof crystalIpcChannels[keyof typeof crystalIpcChannels];

export interface ProjectWatcherUpdatePayload {
  readonly watcherState: ProjectWatcherState;
  readonly refresh: ProjectGraphRefreshResult | null;
}

export interface CrystalIpcRequestMap {
  readonly [channel: string]: void;
}

export interface CrystalIpcResponseMap {
  readonly [channel: string]: unknown;
  readonly "app:get-version": string;
  readonly "app:get-platform": NodeJS.Platform;
  readonly "project:open-folder": ProjectScanResult | null;
  readonly "project:open-html-file": ProjectScanResult | null;
  readonly "project:scan": ProjectScanResult;
  readonly "project:get-graph": ProjectGraph | null;
  readonly "project:start-watcher": ProjectWatcherState;
  readonly "project:stop-watcher": ProjectWatcherState;
  readonly "project:get-watcher-state": ProjectWatcherState;
  readonly "project:refresh-graph": ProjectGraphRefreshResult;
  readonly "project:clear-cache": ProjectWatcherState;
  readonly "project:watcher-updated": ProjectWatcherUpdatePayload;
}
