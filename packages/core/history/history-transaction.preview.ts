import { SOURCE_PATCH_READY_STATUS } from "../source-patch";
import {
  HISTORY_TRANSACTION_BLOCKED_STATUS,
  HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS,
  HISTORY_TRANSACTION_PREVIEW_SAFETY_NOTE,
  HISTORY_TRANSACTION_REPLAY_COMMAND_REDO_STRATEGY,
  HISTORY_TRANSACTION_REVERSE_PATCH_UNDO_STRATEGY,
  HISTORY_TRANSACTION_UNAVAILABLE_REDO_STRATEGY,
  HISTORY_TRANSACTION_UNAVAILABLE_UNDO_STRATEGY,
  HISTORY_TRANSACTION_UNSPECIFIED_CREATED_AT,
  HISTORY_TRANSACTION_UNSUPPORTED_REDO_STRATEGY,
  HISTORY_TRANSACTION_UNSUPPORTED_STATUS,
  HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY
} from "./history-transaction.constants";
import type { HistoryRedoStrategy, HistoryTransactionPreview, HistoryTransactionPreviewInput, HistoryUndoStrategy } from "./history-transaction.types";
import { normalizeAffectedFiles, validateHistoryTransactionPreview } from "./history-transaction.validators";

export function createHistoryTransactionPreview(input: HistoryTransactionPreviewInput): HistoryTransactionPreview {
  const errors: string[] = [];
  const sourcePatchPreview = input.sourcePatchPreview;
  const affectedFiles = normalizeAffectedFiles(input.affectedFiles ?? (sourcePatchPreview ? [sourcePatchPreview.targetFilePath] : []), errors);
  const sourcePatchReady = !sourcePatchPreview || sourcePatchPreview.status === SOURCE_PATCH_READY_STATUS;
  const reversible = input.reversible ?? sourcePatchPreview?.reversible ?? false;
  const blockedReason = input.blockedReason ?? createHistoryBlockedReason(sourcePatchReady, affectedFiles.length, errors);
  const status = input.status ?? deriveHistoryStatus(sourcePatchReady, affectedFiles.length, blockedReason);
  const undoStrategy = input.undoStrategy ?? deriveUndoStrategy(reversible, status);
  const redoStrategy = input.redoStrategy ?? deriveRedoStrategy(status);

  const preview: HistoryTransactionPreview = {
    transactionId: input.transactionId.trim(),
    label: input.label.trim(),
    status,
    sourcePatchPreviewId: sourcePatchPreview?.patchId,
    affectedFiles,
    reversible,
    undoStrategy,
    redoStrategy,
    safetyNotes: [HISTORY_TRANSACTION_PREVIEW_SAFETY_NOTE, ...(input.safetyNotes ?? [])],
    blockedReason,
    createdAt: input.createdAt ?? HISTORY_TRANSACTION_UNSPECIFIED_CREATED_AT
  };

  const validation = validateHistoryTransactionPreview(preview);
  return validation.normalizedPreview ?? preview;
}

function deriveHistoryStatus(sourcePatchReady: boolean, affectedFileCount: number, blockedReason?: string): HistoryTransactionPreview["status"] {
  if (blockedReason || !sourcePatchReady || affectedFileCount === 0) return HISTORY_TRANSACTION_BLOCKED_STATUS;
  return HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS;
}

function createHistoryBlockedReason(sourcePatchReady: boolean, affectedFileCount: number, pathErrors: readonly string[]): string | undefined {
  if (pathErrors.length > 0) return pathErrors.join(" ");
  if (!sourcePatchReady) return "Source Patch Preview is not ready, so a transaction preview cannot be planned.";
  if (affectedFileCount === 0) return "History transaction preview requires at least one affected file.";
  return undefined;
}

function deriveUndoStrategy(reversible: boolean, status: HistoryTransactionPreview["status"]): HistoryUndoStrategy {
  if (status === HISTORY_TRANSACTION_UNSUPPORTED_STATUS) return HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY;
  if (status === HISTORY_TRANSACTION_BLOCKED_STATUS) return HISTORY_TRANSACTION_UNAVAILABLE_UNDO_STRATEGY;
  return reversible ? HISTORY_TRANSACTION_REVERSE_PATCH_UNDO_STRATEGY : HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY;
}

function deriveRedoStrategy(status: HistoryTransactionPreview["status"]): HistoryRedoStrategy {
  if (status === HISTORY_TRANSACTION_UNSUPPORTED_STATUS) return HISTORY_TRANSACTION_UNSUPPORTED_REDO_STRATEGY;
  if (status === HISTORY_TRANSACTION_BLOCKED_STATUS) return HISTORY_TRANSACTION_UNAVAILABLE_REDO_STRATEGY;
  return HISTORY_TRANSACTION_REPLAY_COMMAND_REDO_STRATEGY;
}
