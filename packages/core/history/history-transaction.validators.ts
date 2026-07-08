import { hasUnsafeProjectRelativePath } from "../source-patch";
import {
  HISTORY_TRANSACTION_BLOCKED_STATUS,
  HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS,
  HISTORY_TRANSACTION_REPLAY_COMMAND_REDO_STRATEGY,
  HISTORY_TRANSACTION_REPLAY_PATCH_REDO_STRATEGY,
  HISTORY_TRANSACTION_RESTORE_SNAPSHOT_UNDO_STRATEGY,
  HISTORY_TRANSACTION_REVERSE_PATCH_UNDO_STRATEGY,
  HISTORY_TRANSACTION_UNAVAILABLE_REDO_STRATEGY,
  HISTORY_TRANSACTION_UNAVAILABLE_UNDO_STRATEGY,
  HISTORY_TRANSACTION_UNSUPPORTED_REDO_STRATEGY,
  HISTORY_TRANSACTION_UNSUPPORTED_STATUS,
  HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY
} from "./history-transaction.constants";
import type {
  HistoryRedoStrategy,
  HistoryTransactionPreview,
  HistoryTransactionPreviewStatus,
  HistoryTransactionValidationResult,
  HistoryUndoStrategy
} from "./history-transaction.types";

const ALLOWED_TRANSACTION_STATUSES: readonly HistoryTransactionPreviewStatus[] = [
  HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS,
  HISTORY_TRANSACTION_BLOCKED_STATUS,
  HISTORY_TRANSACTION_UNSUPPORTED_STATUS
];

const ALLOWED_UNDO_STRATEGIES: readonly HistoryUndoStrategy[] = [
  HISTORY_TRANSACTION_REVERSE_PATCH_UNDO_STRATEGY,
  HISTORY_TRANSACTION_RESTORE_SNAPSHOT_UNDO_STRATEGY,
  HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY,
  HISTORY_TRANSACTION_UNAVAILABLE_UNDO_STRATEGY
];

const ALLOWED_REDO_STRATEGIES: readonly HistoryRedoStrategy[] = [
  HISTORY_TRANSACTION_REPLAY_COMMAND_REDO_STRATEGY,
  HISTORY_TRANSACTION_REPLAY_PATCH_REDO_STRATEGY,
  HISTORY_TRANSACTION_UNSUPPORTED_REDO_STRATEGY,
  HISTORY_TRANSACTION_UNAVAILABLE_REDO_STRATEGY
];

export function validateHistoryTransactionPreview(preview: HistoryTransactionPreview): HistoryTransactionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const transactionId = preview.transactionId.trim();
  const label = preview.label.trim();
  const createdAt = preview.createdAt.trim();
  const affectedFiles = normalizeAffectedFiles(preview.affectedFiles, errors);
  const blockedReason = preview.blockedReason?.trim();

  if (!transactionId) errors.push("transactionId is required.");
  if (!label) errors.push("label is required.");
  if (!createdAt) errors.push("createdAt is required; pass a deterministic timestamp or marker to the factory.");
  if (!ALLOWED_TRANSACTION_STATUSES.includes(preview.status)) errors.push(`Unsupported history transaction status: ${preview.status}.`);
  if (!ALLOWED_UNDO_STRATEGIES.includes(preview.undoStrategy)) errors.push(`Unsupported undoStrategy: ${preview.undoStrategy}.`);
  if (!ALLOWED_REDO_STRATEGIES.includes(preview.redoStrategy)) errors.push(`Unsupported redoStrategy: ${preview.redoStrategy}.`);

  if (preview.status === HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS && affectedFiles.length === 0) {
    errors.push("preview-only history transaction previews require at least one affected file.");
  }

  if (preview.status === HISTORY_TRANSACTION_BLOCKED_STATUS && !blockedReason) {
    errors.push("blocked history transaction previews require blockedReason.");
  }

  if (!preview.reversible && preview.undoStrategy !== HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY && preview.undoStrategy !== HISTORY_TRANSACTION_UNAVAILABLE_UNDO_STRATEGY) {
    errors.push("non-reversible history transaction previews must use an unsupported or unavailable undoStrategy.");
  }

  if (preview.safetyNotes.length === 0) warnings.push("History transaction preview should include at least one safety note.");

  const normalizedPreview: HistoryTransactionPreview | undefined = errors.length === 0
    ? {
        ...preview,
        transactionId,
        label,
        affectedFiles,
        blockedReason,
        createdAt,
        safetyNotes: preview.safetyNotes.map((note) => note.trim()).filter(Boolean)
      }
    : undefined;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedPreview
  };
}

export function normalizeAffectedFiles(files: readonly string[], errors: string[] = []): readonly string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const file of files) {
    const trimmed = file.trim();
    if (!trimmed) continue;
    if (hasUnsafeProjectRelativePath(trimmed)) {
      errors.push(`affectedFiles entry must be a safe project-relative path: ${trimmed}`);
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  }

  return normalized;
}
