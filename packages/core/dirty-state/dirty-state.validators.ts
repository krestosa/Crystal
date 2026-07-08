import { DIRTY_STATE_BLOCKED_STATUS, DIRTY_STATE_CLEAN_STATUS, DIRTY_STATE_DIRTY_PREVIEW_STATUS } from "./dirty-state.constants";
import type { DirtyStatePreview, DirtyStatePreviewValidationResult } from "./dirty-state.types";

export function validateDirtyStatePreview(preview: DirtyStatePreview): DirtyStatePreviewValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const affectedFiles = normalizeStringList(preview.affectedFiles, "affectedFiles", errors);
  const pendingTransactionIds = normalizeStringList(preview.pendingTransactionIds, "pendingTransactionIds", errors);
  const sourcePatchPreviewIds = normalizeStringList(preview.sourcePatchPreviewIds, "sourcePatchPreviewIds", errors);

  if (!preview.dirtyStateId.trim()) errors.push("DirtyStatePreview requires a dirtyStateId.");
  if (preview.persistenceAvailable !== false) errors.push("DirtyStatePreview.persistenceAvailable must remain false in Phase 6D.");
  if (preview.hasUnsavedChangesPreview !== (preview.status === DIRTY_STATE_DIRTY_PREVIEW_STATUS)) {
    errors.push("DirtyStatePreview.hasUnsavedChangesPreview must only be true for dirty-preview status.");
  }
  if (preview.status === DIRTY_STATE_DIRTY_PREVIEW_STATUS && affectedFiles.length === 0) {
    errors.push("dirty-preview status requires at least one affected file.");
  }
  if (preview.status === DIRTY_STATE_CLEAN_STATUS && affectedFiles.length > 0) {
    warnings.push("clean dirty-state preview should not include affected files.");
  }
  if (preview.status === DIRTY_STATE_BLOCKED_STATUS && !preview.blockedReason?.trim()) {
    errors.push("blocked dirty-state preview requires a blockedReason.");
  }

  const normalizedPreview: DirtyStatePreview = {
    ...preview,
    dirtyStateId: preview.dirtyStateId.trim(),
    affectedFiles,
    pendingTransactionIds,
    sourcePatchPreviewIds,
    persistenceAvailable: false,
    hasUnsavedChangesPreview: preview.status === DIRTY_STATE_DIRTY_PREVIEW_STATUS,
    safetyNotes: normalizeStringList(preview.safetyNotes, "safetyNotes", errors),
    blockedReason: preview.blockedReason?.trim() || undefined
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function normalizeDirtyStateFileList(values: readonly string[] | undefined, errors: string[] = []): readonly string[] {
  return normalizeStringList(values ?? [], "affectedFiles", errors);
}

function normalizeStringList(values: readonly string[], label: string, errors: string[]): readonly string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const text = value.trim();
    if (!text) {
      errors.push(`${label} cannot contain empty values.`);
      continue;
    }
    normalized.add(text.replace(/\\/g, "/"));
  }
  return [...normalized].sort();
}
