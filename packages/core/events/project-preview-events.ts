import type { CrystalEvent } from "./event.types";
import type { ProjectPreviewIssue, ProjectPreviewLoadResult, ProjectPreviewState, ProjectPreviewTarget } from "../project/preview/project-preview.types";

export const projectPreviewEventTypes = {
  projectPreviewLoadRequested: "ProjectPreviewLoadRequested",
  projectPreviewLoaded: "ProjectPreviewLoaded",
  projectPreviewLoadFailed: "ProjectPreviewLoadFailed",
  projectPreviewReloadRequested: "ProjectPreviewReloadRequested",
  projectPreviewReloaded: "ProjectPreviewReloaded",
  projectPreviewReloadFailed: "ProjectPreviewReloadFailed",
  projectPreviewTargetChanged: "ProjectPreviewTargetChanged",
  projectPreviewIssueReported: "ProjectPreviewIssueReported"
} as const;

export type ProjectPreviewLoadRequestedEvent = CrystalEvent<{ readonly state: ProjectPreviewState }> & { readonly type: "ProjectPreviewLoadRequested" };
export type ProjectPreviewLoadedEvent = CrystalEvent<{ readonly result: ProjectPreviewLoadResult }> & { readonly type: "ProjectPreviewLoaded" };
export type ProjectPreviewLoadFailedEvent = CrystalEvent<{ readonly issue: ProjectPreviewIssue; readonly state: ProjectPreviewState }> & { readonly type: "ProjectPreviewLoadFailed" };
export type ProjectPreviewReloadRequestedEvent = CrystalEvent<{ readonly state: ProjectPreviewState }> & { readonly type: "ProjectPreviewReloadRequested" };
export type ProjectPreviewReloadedEvent = CrystalEvent<{ readonly result: ProjectPreviewLoadResult }> & { readonly type: "ProjectPreviewReloaded" };
export type ProjectPreviewReloadFailedEvent = CrystalEvent<{ readonly issue: ProjectPreviewIssue; readonly state: ProjectPreviewState }> & { readonly type: "ProjectPreviewReloadFailed" };
export type ProjectPreviewTargetChangedEvent = CrystalEvent<{ readonly target: ProjectPreviewTarget | null; readonly state: ProjectPreviewState }> & { readonly type: "ProjectPreviewTargetChanged" };
export type ProjectPreviewIssueReportedEvent = CrystalEvent<{ readonly issue: ProjectPreviewIssue; readonly state: ProjectPreviewState }> & { readonly type: "ProjectPreviewIssueReported" };

export type ProjectPreviewEvent =
  | ProjectPreviewLoadRequestedEvent
  | ProjectPreviewLoadedEvent
  | ProjectPreviewLoadFailedEvent
  | ProjectPreviewReloadRequestedEvent
  | ProjectPreviewReloadedEvent
  | ProjectPreviewReloadFailedEvent
  | ProjectPreviewTargetChangedEvent
  | ProjectPreviewIssueReportedEvent;
