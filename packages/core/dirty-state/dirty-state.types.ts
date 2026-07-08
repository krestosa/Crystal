export type DirtyStatePreviewStatus = "clean" | "dirty-preview" | "blocked" | "unsupported";

export interface DirtyStatePreview {
  readonly dirtyStateId: string;
  readonly status: DirtyStatePreviewStatus;
  readonly affectedFiles: readonly string[];
  readonly pendingTransactionIds: readonly string[];
  readonly sourcePatchPreviewIds: readonly string[];
  readonly hasUnsavedChangesPreview: boolean;
  readonly persistenceAvailable: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface DirtyStatePreviewInput {
  readonly dirtyStateId: string;
  readonly status?: DirtyStatePreviewStatus;
  readonly affectedFiles?: readonly string[];
  readonly pendingTransactionIds?: readonly string[];
  readonly sourcePatchPreviewIds?: readonly string[];
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export interface DirtyStatePreviewValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: DirtyStatePreview;
}
