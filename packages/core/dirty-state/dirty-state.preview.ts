import {
  DIRTY_STATE_BLOCKED_STATUS,
  DIRTY_STATE_CLEAN_STATUS,
  DIRTY_STATE_DIRTY_PREVIEW_STATUS,
  DIRTY_STATE_PERSISTENCE_UNAVAILABLE_REASON,
  DIRTY_STATE_PREVIEW_SAFETY_NOTE,
  DIRTY_STATE_UNSUPPORTED_STATUS
} from "./dirty-state.constants";
import type { DirtyStatePreview, DirtyStatePreviewInput } from "./dirty-state.types";
import { normalizeDirtyStateFileList, validateDirtyStatePreview } from "./dirty-state.validators";

export function createDirtyStatePreview(input: DirtyStatePreviewInput): DirtyStatePreview {
  const errors: string[] = [];
  const affectedFiles = normalizeDirtyStateFileList(input.affectedFiles, errors);
  const pendingTransactionIds = normalizeIdList(input.pendingTransactionIds);
  const sourcePatchPreviewIds = normalizeIdList(input.sourcePatchPreviewIds);
  const blockedReason = input.blockedReason ?? createDirtyStateBlockedReason(affectedFiles.length, pendingTransactionIds.length, sourcePatchPreviewIds.length, errors);
  const status = input.status ?? deriveDirtyStateStatus(affectedFiles.length, pendingTransactionIds.length, sourcePatchPreviewIds.length, blockedReason);

  const preview: DirtyStatePreview = {
    dirtyStateId: input.dirtyStateId.trim(),
    status,
    affectedFiles,
    pendingTransactionIds,
    sourcePatchPreviewIds,
    hasUnsavedChangesPreview: status === DIRTY_STATE_DIRTY_PREVIEW_STATUS,
    persistenceAvailable: false,
    blockedReason,
    safetyNotes: [DIRTY_STATE_PREVIEW_SAFETY_NOTE, DIRTY_STATE_PERSISTENCE_UNAVAILABLE_REASON, ...(input.safetyNotes ?? [])]
  };

  const validation = validateDirtyStatePreview(preview);
  return validation.normalizedPreview ?? preview;
}

function deriveDirtyStateStatus(affectedFileCount: number, transactionCount: number, sourcePatchCount: number, blockedReason?: string): DirtyStatePreview["status"] {
  if (blockedReason) return DIRTY_STATE_BLOCKED_STATUS;
  if (affectedFileCount === 0 && transactionCount === 0 && sourcePatchCount === 0) return DIRTY_STATE_CLEAN_STATUS;
  if (affectedFileCount > 0 && (transactionCount > 0 || sourcePatchCount > 0)) return DIRTY_STATE_DIRTY_PREVIEW_STATUS;
  return DIRTY_STATE_UNSUPPORTED_STATUS;
}

function createDirtyStateBlockedReason(affectedFileCount: number, transactionCount: number, sourcePatchCount: number, errors: readonly string[]): string | undefined {
  if (errors.length > 0) return errors.join(" ");
  if (affectedFileCount > 0 && transactionCount === 0 && sourcePatchCount === 0) {
    return "Dirty-state preview requires a transaction preview or Source Patch Preview before marking affected files dirty.";
  }
  return undefined;
}

function normalizeIdList(values: readonly string[] | undefined): readonly string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].sort();
}
