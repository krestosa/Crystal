import type { ProjectDependency, ProjectFile, ProjectGraph, ProjectScanIssue, ProjectScanResult } from "../project/graph/project-graph.types";
import type { CrystalEvent } from "./event.types";

export const projectEventTypes = {
  projectOpened: "ProjectOpened",
  projectScanStarted: "ProjectScanStarted",
  projectScanCompleted: "ProjectScanCompleted",
  projectScanFailed: "ProjectScanFailed",
  projectGraphUpdated: "ProjectGraphUpdated",
  projectFileDiscovered: "ProjectFileDiscovered",
  projectDependencyMissing: "ProjectDependencyMissing"
} as const;

export type ProjectOpenedEvent = CrystalEvent<{ readonly rootPath: string }> & { readonly type: "ProjectOpened" };
export type ProjectScanStartedEvent = CrystalEvent<{ readonly rootPath: string }> & { readonly type: "ProjectScanStarted" };
export type ProjectScanCompletedEvent = CrystalEvent<{ readonly result: ProjectScanResult }> & { readonly type: "ProjectScanCompleted" };
export type ProjectScanFailedEvent = CrystalEvent<{ readonly rootPath: string; readonly error: string }> & { readonly type: "ProjectScanFailed" };
export type ProjectGraphUpdatedEvent = CrystalEvent<{ readonly graph: ProjectGraph; readonly issues: readonly ProjectScanIssue[] }> & { readonly type: "ProjectGraphUpdated" };
export type ProjectFileDiscoveredEvent = CrystalEvent<{ readonly file: ProjectFile }> & { readonly type: "ProjectFileDiscovered" };
export type ProjectDependencyMissingEvent = CrystalEvent<{ readonly dependency: ProjectDependency }> & { readonly type: "ProjectDependencyMissing" };
