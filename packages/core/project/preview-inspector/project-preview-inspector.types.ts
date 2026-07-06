import type { ProjectDomAttribute, ProjectDomNodeType, ProjectDomSourceLocation } from "../dom/project-dom-snapshot.types";
import type { ProjectPreviewSelectionMappingStatus } from "../preview-selection/mapping/project-preview-selection-mapping.types";
import type { ProjectPreviewSelectedNodeAttribute } from "../preview-selection/project-preview-selection.types";

export type ProjectPreviewInspectorStatus =
  | "idle"
  | "selected"
  | "mapped"
  | "missing-snapshot"
  | "stale"
  | "mismatched"
  | "ambiguous"
  | "defensive";

export interface ProjectPreviewInspectorSelectedNodeDetails {
  readonly tagName: string;
  readonly snapshotPath: string;
  readonly mappedSnapshotPath: string | null;
  readonly mappingStatus: ProjectPreviewSelectionMappingStatus;
  readonly mappingReason: string | null;
  readonly selectorPreview: string;
  readonly textPreview: string;
  readonly attributesPreview: readonly ProjectPreviewSelectedNodeAttribute[];
}

export interface ProjectPreviewInspectorSnapshotNodeDetails {
  readonly type: ProjectDomNodeType;
  readonly tagName: string | null;
  readonly snapshotPath: string;
  readonly depth: number;
  readonly siblingIndex: number;
  readonly childCount: number;
  readonly textPreview: string | null;
  readonly attributes: readonly ProjectDomAttribute[];
  readonly sourceLocation: ProjectDomSourceLocation | null;
  readonly truncated: boolean;
}

export interface ProjectPreviewInspectorViewModel {
  readonly status: ProjectPreviewInspectorStatus;
  readonly message: string;
  readonly selectedNode: ProjectPreviewInspectorSelectedNodeDetails | null;
  readonly snapshotNode: ProjectPreviewInspectorSnapshotNodeDetails | null;
}
