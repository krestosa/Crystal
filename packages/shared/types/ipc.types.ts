import type { ProjectGraph, ProjectScanResult } from "../../core/project/graph/project-graph.types";

export type CrystalIpcChannel =
  | "app:get-version"
  | "app:get-platform"
  | "project:open-folder"
  | "project:open-html-file"
  | "project:scan"
  | "project:get-graph";

export interface CrystalIpcRequestMap {
  readonly "app:get-version": void;
  readonly "app:get-platform": void;
  readonly "project:open-folder": void;
  readonly "project:open-html-file": void;
  readonly "project:scan": void;
  readonly "project:get-graph": void;
}

export interface CrystalIpcResponseMap {
  readonly "app:get-version": string;
  readonly "app:get-platform": NodeJS.Platform;
  readonly "project:open-folder": ProjectScanResult | null;
  readonly "project:open-html-file": ProjectScanResult | null;
  readonly "project:scan": ProjectScanResult;
  readonly "project:get-graph": ProjectGraph | null;
}
