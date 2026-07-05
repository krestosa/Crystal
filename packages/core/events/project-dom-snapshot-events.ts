import type { CrystalEvent } from "./event.types";
import type { ProjectDomSnapshotBuildResult, ProjectDomSnapshotState } from "../project/dom/project-dom-snapshot.types";

export const projectDomSnapshotEventTypes = {
  projectDomSnapshotRequested: "ProjectDomSnapshotRequested",
  projectDomSnapshotCreated: "ProjectDomSnapshotCreated",
  projectDomSnapshotFailed: "ProjectDomSnapshotFailed",
  projectDomSnapshotCleared: "ProjectDomSnapshotCleared"
} as const;

export type ProjectDomSnapshotRequestedEvent = CrystalEvent<{ readonly state: ProjectDomSnapshotState }> & { readonly type: "ProjectDomSnapshotRequested" };
export type ProjectDomSnapshotCreatedEvent = CrystalEvent<{ readonly result: ProjectDomSnapshotBuildResult }> & { readonly type: "ProjectDomSnapshotCreated" };
export type ProjectDomSnapshotFailedEvent = CrystalEvent<{ readonly result: ProjectDomSnapshotBuildResult }> & { readonly type: "ProjectDomSnapshotFailed" };
export type ProjectDomSnapshotClearedEvent = CrystalEvent<{ readonly state: ProjectDomSnapshotState }> & { readonly type: "ProjectDomSnapshotCleared" };

export type ProjectDomSnapshotEvent =
  | ProjectDomSnapshotRequestedEvent
  | ProjectDomSnapshotCreatedEvent
  | ProjectDomSnapshotFailedEvent
  | ProjectDomSnapshotClearedEvent;
