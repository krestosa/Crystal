import type { ProjectDomSnapshotBuildResult, ProjectDomSnapshotState } from "../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectGraph, ProjectScanResult } from "../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectPreviewLoadResult, ProjectPreviewState } from "../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectGraphRefreshResult } from "../../../../../packages/core/project/refresh/project-graph-refresh.types";
import type { ProjectWatcherState } from "../../../../../packages/core/project/watching/project-watch.types";
import type { ProjectWatcherUpdatePayload } from "../../../../../packages/shared/types/ipc.types";

export interface CrystalPreloadApi {
  readonly app: {
    readonly getVersion: () => Promise<string>;
    readonly getPlatform: () => Promise<NodeJS.Platform>;
  };
  readonly project: {
    readonly openFolder: () => Promise<ProjectScanResult | null>;
    readonly openHtmlFile: () => Promise<ProjectScanResult | null>;
    readonly scan: () => Promise<ProjectScanResult>;
    readonly getGraph: () => Promise<ProjectGraph | null>;
    readonly startWatcher: () => Promise<ProjectWatcherState>;
    readonly stopWatcher: () => Promise<ProjectWatcherState>;
    readonly getWatcherState: () => Promise<ProjectWatcherState>;
    readonly refreshGraph: () => Promise<ProjectGraphRefreshResult>;
    readonly clearCache: () => Promise<ProjectWatcherState>;
    readonly loadPreview: () => Promise<ProjectPreviewLoadResult>;
    readonly reloadPreview: () => Promise<ProjectPreviewLoadResult>;
    readonly setPreviewTarget: (relativePath: string) => Promise<ProjectPreviewLoadResult>;
    readonly getPreviewState: () => Promise<ProjectPreviewState>;
    readonly buildDomSnapshot: () => Promise<ProjectDomSnapshotBuildResult>;
    readonly getDomSnapshotState: () => Promise<ProjectDomSnapshotState>;
    readonly clearDomSnapshot: () => Promise<ProjectDomSnapshotState>;
    readonly onWatcherStateChanged: (listener: (payload: ProjectWatcherUpdatePayload) => void) => () => void;
    readonly onPreviewStateChanged: (listener: (state: ProjectPreviewState) => void) => () => void;
    readonly onDomSnapshotStateChanged: (listener: (state: ProjectDomSnapshotState) => void) => () => void;
  };
}
