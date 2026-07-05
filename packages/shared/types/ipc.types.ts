import type { ProjectDomSnapshotBuildResult, ProjectDomSnapshotState } from "../../core/project/dom/project-dom-snapshot.types";
import type { ProjectGraph, ProjectScanResult } from "../../core/project/graph/project-graph.types";
import type { ProjectPreviewSelectionState } from "../../core/project/preview-selection/project-preview-selection.types";
import type { ProjectPreviewLoadResult, ProjectPreviewSetTargetRequest, ProjectPreviewState } from "../../core/project/preview/project-preview.types";
import type { ProjectGraphRefreshResult } from "../../core/project/refresh/project-graph-refresh.types";
import type { ProjectWatcherState } from "../../core/project/watching/project-watch.types";
import type { crystalIpcChannels } from "../constants/ipc.constants";

export type CrystalIpcChannel = typeof crystalIpcChannels[keyof typeof crystalIpcChannels];

export interface ProjectWatcherUpdatePayload {
  readonly watcherState: ProjectWatcherState;
  readonly refresh: ProjectGraphRefreshResult | null;
}

export interface CrystalIpcRequestMap {
  readonly [channel: string]: unknown;
  readonly "project:preview-set-target": ProjectPreviewSetTargetRequest;
  readonly "project:preview-selection:set-selected-node": unknown;
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
  readonly "project:preview-load": ProjectPreviewLoadResult;
  readonly "project:preview-reload": ProjectPreviewLoadResult;
  readonly "project:preview-set-target": ProjectPreviewLoadResult;
  readonly "project:preview-get-state": ProjectPreviewState;
  readonly "project:preview-updated": ProjectPreviewState;
  readonly "project:dom-snapshot-build": ProjectDomSnapshotBuildResult;
  readonly "project:dom-snapshot-get-state": ProjectDomSnapshotState;
  readonly "project:dom-snapshot-clear": ProjectDomSnapshotState;
  readonly "project:dom-snapshot-updated": ProjectDomSnapshotState;
  readonly "project:preview-selection:get-state": ProjectPreviewSelectionState;
  readonly "project:preview-selection:enable": ProjectPreviewSelectionState;
  readonly "project:preview-selection:disable": ProjectPreviewSelectionState;
  readonly "project:preview-selection:clear": ProjectPreviewSelectionState;
  readonly "project:preview-selection:set-selected-node": ProjectPreviewSelectionState;
  readonly "project:preview-selection:state-changed": ProjectPreviewSelectionState;
}
