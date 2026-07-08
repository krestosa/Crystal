import {
  DESIGN_EDITING_APPLY_BLOCKED_REASON,
  DESIGN_EDITING_BLOCKED_STATUS,
  DESIGN_EDITING_FUTURE_REQUIREMENTS,
  DESIGN_EDITING_PREVIEW_SAFETY_NOTE
} from "./design-editing.constants";
import type { DesignEditingReadinessPreview, DesignEditingReadinessPreviewInput } from "./design-editing.types";
import { createDirtyStatePreview } from "../dirty-state";
import { createSourceConflictPreview } from "../source-conflict";
import { createWriteRuntimeCapabilityPreview } from "../write-runtime";
import { normalizeDesignEditingFileList, validateDesignEditingReadinessPreview } from "./design-editing.validators";

export function createDesignEditingReadinessPreview(input: DesignEditingReadinessPreviewInput): DesignEditingReadinessPreview {
  const errors: string[] = [];
  const affectedFiles = normalizeDesignEditingFileList(collectAffectedFiles(input), errors);
  const transactionPlanPreview = input.transactionPlanPreview;
  const sourcePatchPreviewIds = transactionPlanPreview?.sourcePatchPreviewId ? [transactionPlanPreview.sourcePatchPreviewId] : [];
  const pendingTransactionIds = transactionPlanPreview?.historyTransactionPreview.transactionId ? [transactionPlanPreview.historyTransactionPreview.transactionId] : [];

  const dirtyStatePreview = input.dirtyStatePreview ?? createDirtyStatePreview({
    dirtyStateId: `${input.readinessId.trim()}:dirty-state`,
    affectedFiles,
    pendingTransactionIds,
    sourcePatchPreviewIds
  });

  const sourceConflictPreview = input.sourceConflictPreview ?? createSourceConflictPreview({
    conflictPreviewId: `${input.readinessId.trim()}:source-conflict`,
    affectedFiles,
    requiresFreshSource: affectedFiles.length > 0
  });

  const writeRuntimeCapabilityPreview = input.writeRuntimeCapabilityPreview ?? createWriteRuntimeCapabilityPreview({
    capabilityId: `${input.readinessId.trim()}:write-runtime`
  });

  const preview: DesignEditingReadinessPreview = {
    readinessId: input.readinessId.trim(),
    status: DESIGN_EDITING_BLOCKED_STATUS,
    applyAvailable: false,
    applyBlockedReason: DESIGN_EDITING_APPLY_BLOCKED_REASON,
    affectedFiles,
    transactionPlanPreview,
    dirtyStatePreview,
    sourceConflictPreview,
    writeRuntimeCapabilityPreview,
    futureRequirements: input.futureRequirements ?? DESIGN_EDITING_FUTURE_REQUIREMENTS,
    safetyNotes: [DESIGN_EDITING_PREVIEW_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateDesignEditingReadinessPreview(preview);
  return validation.normalizedPreview ?? preview;
}

function collectAffectedFiles(input: DesignEditingReadinessPreviewInput): readonly string[] {
  const files = new Set<string>();
  for (const filePath of input.transactionPlanPreview?.affectedFiles ?? []) files.add(filePath);
  for (const filePath of input.dirtyStatePreview?.affectedFiles ?? []) files.add(filePath);
  for (const filePath of input.sourceConflictPreview?.affectedFiles ?? []) files.add(filePath);
  return [...files];
}
