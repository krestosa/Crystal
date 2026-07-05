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
  | "unknown";

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
}

export interface ProjectPreviewSelectionIssue {
  readonly code: ProjectPreviewSelectionIssueCode;
  readonly message: string;
  readonly severity: ProjectPreviewSelectionIssueSeverity;
  readonly timestamp: number;
}

export interface ProjectPreviewSelectionState {
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
