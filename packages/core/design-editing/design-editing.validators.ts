import { DESIGN_EDITING_BLOCKED_STATUS } from "./design-editing.constants";
import type { DesignEditingReadinessPreview, DesignEditingReadinessValidationResult } from "./design-editing.types";

export function validateDesignEditingReadinessPreview(preview: DesignEditingReadinessPreview): DesignEditingReadinessValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const affectedFiles = normalizeDesignEditingFileList(preview.affectedFiles, errors);

  if (!preview.readinessId.trim()) errors.push("DesignEditingReadinessPreview requires a readinessId.");
  if (preview.applyAvailable !== false) errors.push("DesignEditingReadinessPreview.applyAvailable must remain false in Phase 6D.");
  if (!preview.applyBlockedReason.trim()) errors.push("DesignEditingReadinessPreview requires an applyBlockedReason.");
  if (preview.writeRuntimeCapabilityPreview.canWriteFiles !== false) errors.push("Readiness cannot include write-capable runtime in Phase 6D.");
  if (preview.writeRuntimeCapabilityPreview.hasWriteIpc !== false) errors.push("Readiness cannot include write IPC in Phase 6D.");
  if (preview.writeRuntimeCapabilityPreview.canApplyPatches !== false) errors.push("Readiness cannot include patch application in Phase 6D.");
  if (preview.writeRuntimeCapabilityPreview.canPersistTransactions !== false) errors.push("Readiness cannot include durable transaction persistence in Phase 6D.");
  if (preview.writeRuntimeCapabilityPreview.canExecuteUndoRedo !== false) errors.push("Readiness cannot include undo/redo execution in Phase 6D.");
  if (preview.dirtyStatePreview.persistenceAvailable !== false) errors.push("Readiness cannot include dirty-state persistence in Phase 6D.");
  if (preview.sourceConflictPreview.canApplyWithoutRecheck !== false) errors.push("Readiness cannot bypass source conflict rechecks in Phase 6D.");
  if (preview.status !== DESIGN_EDITING_BLOCKED_STATUS) warnings.push("Design editing readiness should remain blocked while write runtime is unavailable.");

  const normalizedPreview: DesignEditingReadinessPreview = {
    ...preview,
    readinessId: preview.readinessId.trim(),
    applyAvailable: false,
    applyBlockedReason: preview.applyBlockedReason.trim(),
    affectedFiles,
    safetyNotes: normalizeStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function normalizeDesignEditingFileList(values: readonly string[] | undefined, errors: string[] = []): readonly string[] {
  return normalizeStringList(values ?? [], "affectedFiles", errors).map((value) => value.replace(/\\/g, "/"));
}

function normalizeStringList(values: readonly string[], label: string, errors: string[]): readonly string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const text = value.trim();
    if (!text) {
      errors.push(`${label} cannot contain empty values.`);
      continue;
    }
    normalized.add(text);
  }
  return [...normalized].sort();
}
