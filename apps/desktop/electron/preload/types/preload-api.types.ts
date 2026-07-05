import type { ProjectGraph, ProjectScanResult } from "../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectGraphRefreshResult } from "../../../../../packages/core/project/refresh/project-graph-refresh.types";
import type { ProjectWatcherState } from "../../../../../packages/core/project/watching/project-watch.types";

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
  };
}
