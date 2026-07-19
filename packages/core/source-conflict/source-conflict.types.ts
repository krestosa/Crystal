import type { SourceRevisionReadResult } from "./source-version.types";

export type SourceConflictPreviewStatus = "not-checked" | "clean-preview" | "conflict-risk" | "blocked" | "unsupported";

export interface SourceConflictPreview {
  readonly conflictPreviewId: string;
  readonly status: SourceConflictPreviewStatus;
  readonly affectedFiles: readonly string[];
  readonly expectedSourceVersion?: string;
  readonly observedSourceVersion?: string;
  readonly requiresFreshSource: boolean;
  readonly canApplyWithoutRecheck: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface SourceConflictPreviewInput {
  readonly conflictPreviewId: string;
  readonly status?: SourceConflictPreviewStatus;
  readonly affectedFiles?: readonly string[];
  readonly expectedSourceVersion?: string;
  readonly observedSourceVersion?: string;
  readonly requiresFreshSource?: boolean;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export interface SourceConflictRevisionCheckInput {
  readonly conflictPreviewId: string;
  readonly affectedFiles?: readonly string[];
  readonly expectedSourceVersion?: string;
  readonly revisionReadResult: SourceRevisionReadResult;
  readonly requiresFreshSource?: boolean;
  readonly safetyNotes?: readonly string[];
}

export interface SourceConflictPreviewValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: SourceConflictPreview;
}
