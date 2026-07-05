import type { ProjectGraph, ProjectScanResult } from "../../../../../packages/core/project/graph/project-graph.types";

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
  };
}
