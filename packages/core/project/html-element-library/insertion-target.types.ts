import type { ProjectDomSnapshotState } from "../dom/project-dom-snapshot.types";
import type { ProjectGraph } from "../graph/project-graph.types";
import type { ProjectPreviewState } from "../preview/project-preview.types";
import type { ProjectPreviewSelectionState } from "../preview-selection/project-preview-selection.types";

export type HtmlInsertionTargetStateCode =
  | "none"
  | "no-project"
  | "no-preview-target"
  | "no-selection"
  | "missing-snapshot"
  | "stale-snapshot"
  | "mismatched-selection"
  | "ambiguous-selection"
  | "matched-target"
  | "unsupported-target";

export interface HtmlInsertionTargetEligibilityInput {
  readonly projectGraph: ProjectGraph | null;
  readonly preview: ProjectPreviewState | null;
  readonly domSnapshot: ProjectDomSnapshotState | null;
  readonly previewSelection: ProjectPreviewSelectionState | null;
}

export interface HtmlInsertionTargetEligibility {
  readonly state: HtmlInsertionTargetStateCode;
  readonly label: string;
  readonly reason: string;
  readonly targetTagName?: string;
  readonly targetSnapshotPath?: string;
  readonly targetFilePath?: string;
  readonly canInsertBefore: boolean;
  readonly canInsertAfter: boolean;
  readonly canInsertInside: boolean;
}
