import type { SourcePatchPreview } from "../source-patch";

export type HistoryTransactionPreviewStatus = "preview-only" | "blocked" | "unsupported";
export type HistoryUndoStrategy = "reverse-patch" | "restore-snapshot" | "unsupported" | "unavailable";
export type HistoryRedoStrategy = "replay-command" | "replay-patch" | "unsupported" | "unavailable";

export interface HistoryTransactionPreview {
  readonly transactionId: string;
  readonly label: string;
  readonly status: HistoryTransactionPreviewStatus;
  readonly sourcePatchPreviewId?: string;
  readonly affectedFiles: readonly string[];
  readonly reversible: boolean;
  readonly undoStrategy: HistoryUndoStrategy;
  readonly redoStrategy: HistoryRedoStrategy;
  readonly safetyNotes: readonly string[];
  readonly blockedReason?: string;
  readonly createdAt: string;
}

export interface HistoryTransactionPreviewInput {
  readonly transactionId: string;
  readonly label: string;
  readonly status?: HistoryTransactionPreviewStatus;
  readonly sourcePatchPreview?: SourcePatchPreview;
  readonly affectedFiles?: readonly string[];
  readonly reversible?: boolean;
  readonly undoStrategy?: HistoryUndoStrategy;
  readonly redoStrategy?: HistoryRedoStrategy;
  readonly safetyNotes?: readonly string[];
  readonly blockedReason?: string;
  readonly createdAt?: string;
}

export interface HistoryTransactionValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: HistoryTransactionPreview;
}
