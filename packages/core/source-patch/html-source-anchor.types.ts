import type { ProjectDomSnapshotState, ProjectDomSourceLocation } from "../project/dom/project-dom-snapshot.types";
import type { HtmlElementInsertionMode, HtmlElementLibraryItem, HtmlInsertionTargetEligibility } from "../project/html-element-library";

export type HtmlSourceInsertionAnchorConfidence = "exact" | "estimated" | "unavailable";
export type HtmlSourceInsertionAnchorStatus = "ready" | "missing-source-location" | "unsupported-target" | "unsupported-mode";

export interface HtmlSourceInsertionAnchorSourceLocation {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface HtmlSourceInsertionAnchor {
  readonly targetFilePath: string;
  readonly targetSnapshotPath: string;
  readonly targetTagName: string;
  readonly insertionMode: HtmlElementInsertionMode;
  readonly sourceLocation: HtmlSourceInsertionAnchorSourceLocation | null;
  readonly confidence: HtmlSourceInsertionAnchorConfidence;
  readonly status: HtmlSourceInsertionAnchorStatus;
  readonly reason: string;
}

export interface CreateHtmlSourceInsertionAnchorInput {
  readonly targetEligibility: HtmlInsertionTargetEligibility;
  readonly domSnapshotState: ProjectDomSnapshotState | null;
  readonly insertionMode: HtmlElementInsertionMode;
  readonly selectedItem: HtmlElementLibraryItem | null;
}

export interface HtmlSourceInsertionAnchorValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedAnchor?: HtmlSourceInsertionAnchor;
}

export function toHtmlSourceInsertionAnchorSourceLocation(sourceLocation: ProjectDomSourceLocation): HtmlSourceInsertionAnchorSourceLocation {
  return {
    offset: sourceLocation.offset,
    line: sourceLocation.line,
    column: sourceLocation.column
  };
}
