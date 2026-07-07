import type { ProjectPreviewSelectionMappingMetadata } from "./mapping/project-preview-selection-mapping.types";

export type ProjectPreviewSelectionMode = "idle" | "selecting" | "selected" | "failed";

export type ProjectPreviewSelectionIssueSeverity = "info" | "warning" | "error";

export type ProjectPreviewSelectionIssueCode =
  | "invalid-selected-node-payload"
  | "invalid-snapshot-path"
  | "invalid-tag-name"
  | "invalid-sibling-index"
  | "invalid-depth"
  | "invalid-attributes-preview"
  | "invalid-text-preview"
  | "invalid-selector-preview"
  | "invalid-selection-rect"
  | "unknown";

export type ProjectPreviewSelectionRectCoordinateSpace = "iframe-viewport";

export interface ProjectPreviewSelectionRect {
  readonly coordinateSpace: ProjectPreviewSelectionRectCoordinateSpace;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ProjectPreviewSelectedNodeAttribute {
  readonly name: string;
  readonly value: string | null;
}

export interface ProjectPreviewSelectedNode {
  readonly snapshotPath: string;
  readonly tagName: string;
  readonly siblingIndex: number;
  readonly depth: number;
  readonly attributesPreview: readonly ProjectPreviewSelectedNodeAttribute[];
  readonly textPreview: string;
  readonly selectorPreview: string;
  readonly selectionRect: ProjectPreviewSelectionRect | null;
}

export interface ProjectPreviewSelectionIssue {
  readonly code: ProjectPreviewSelectionIssueCode;
  readonly message: string;
  readonly severity: ProjectPreviewSelectionIssueSeverity;
  readonly timestamp: number;
}

export interface ProjectPreviewSelectionState extends ProjectPreviewSelectionMappingMetadata {
  readonly enabled: boolean;
  readonly mode: ProjectPreviewSelectionMode;
  readonly selectedNode: ProjectPreviewSelectedNode | null;
  readonly lastSelectedAt: number | null;
  readonly lastIssue: ProjectPreviewSelectionIssue | null;
}

export interface ProjectPreviewSelectedNodeValidationResult {
  readonly ok: boolean;
  readonly selectedNode: ProjectPreviewSelectedNode | null;
  readonly issue: ProjectPreviewSelectionIssue | null;
}
