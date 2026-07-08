import {
  INSPECTOR_EDITING_BLOCKED_DRAFT_STATUS,
  INSPECTOR_EDITING_BLOCKED_FIELD_STATUS,
  INSPECTOR_EDITING_BLOCKED_INTENT_STATUS,
  INSPECTOR_EDITING_READINESS_BLOCKED_STATUS,
  INSPECTOR_EDITING_UNSUPPORTED_FIELD_STATUS,
  INSPECTOR_EDITING_UNSUPPORTED_INTENT_STATUS
} from "./inspector-editing.constants";
import type {
  InspectorEditableFieldPreview,
  InspectorEditingReadinessPreview,
  InspectorEditingValidationResult,
  InspectorEditDraftPreview,
  InspectorEditIntentPreview
} from "./inspector-editing.types";

export function validateInspectorEditableFieldPreview(
  preview: InspectorEditableFieldPreview
): InspectorEditingValidationResult<InspectorEditableFieldPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.fieldId.trim()) errors.push("InspectorEditableFieldPreview requires a fieldId.");
  if (!preview.nodePath.trim() && !isBlockedOrUnsupportedField(preview)) {
    errors.push("InspectorEditableFieldPreview requires a nodePath unless it is blocked or unsupported.");
  }
  if (!preview.label.trim()) errors.push("InspectorEditableFieldPreview requires a label.");
  if (preview.canApply !== false) errors.push("InspectorEditableFieldPreview.canApply must remain false in Phase 7A.");
  if (preview.status === INSPECTOR_EDITING_BLOCKED_FIELD_STATUS && !preview.blockedReason?.trim()) {
    warnings.push("Blocked InspectorEditableFieldPreview should include a blockedReason.");
  }
  if (preview.canDraft && preview.status !== "draftable") errors.push("InspectorEditableFieldPreview.canDraft requires draftable status.");

  const normalizedPreview: InspectorEditableFieldPreview = {
    ...preview,
    fieldId: preview.fieldId.trim(),
    nodePath: preview.nodePath.trim(),
    label: preview.label.trim(),
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeInspectorEditingStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function validateInspectorEditDraftPreview(
  preview: InspectorEditDraftPreview
): InspectorEditingValidationResult<InspectorEditDraftPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.draftId.trim()) errors.push("InspectorEditDraftPreview requires a draftId.");
  if (!preview.selectedNodePath.trim() && preview.status !== INSPECTOR_EDITING_BLOCKED_DRAFT_STATUS) {
    errors.push("InspectorEditDraftPreview requires a selectedNodePath unless it is blocked.");
  }
  if (!preview.snapshotVersion.trim()) errors.push("InspectorEditDraftPreview requires a snapshotVersion.");
  if (preview.applyAvailable !== false) errors.push("InspectorEditDraftPreview.applyAvailable must remain false in Phase 7A.");
  if (preview.status === INSPECTOR_EDITING_BLOCKED_DRAFT_STATUS && !preview.blockedReason?.trim()) {
    warnings.push("Blocked InspectorEditDraftPreview should include a blockedReason.");
  }

  const fieldIds = new Set(preview.fields.map((field) => field.fieldId));
  for (const changedFieldId of preview.changedFieldIds) {
    if (!fieldIds.has(changedFieldId)) errors.push(`Changed field is not part of draft fields: ${changedFieldId}`);
  }

  const normalizedPreview: InspectorEditDraftPreview = {
    ...preview,
    draftId: preview.draftId.trim(),
    selectedNodePath: preview.selectedNodePath.trim(),
    snapshotVersion: preview.snapshotVersion.trim(),
    changedFieldIds: normalizeInspectorEditingStringList(preview.changedFieldIds, "changedFieldIds", errors),
    affectedFiles: normalizeInspectorEditingFileList(preview.affectedFiles, errors),
    sourcePatchPreviewId: preview.sourcePatchPreviewId?.trim() || undefined,
    transactionPlanPreviewId: preview.transactionPlanPreviewId?.trim() || undefined,
    readinessPreviewId: preview.readinessPreviewId?.trim() || undefined,
    applyAvailable: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeInspectorEditingStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function validateInspectorEditIntentPreview(
  preview: InspectorEditIntentPreview
): InspectorEditingValidationResult<InspectorEditIntentPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.intentId.trim()) errors.push("InspectorEditIntentPreview requires an intentId.");
  if (!preview.targetNodePath.trim() && !isBlockedOrUnsupportedIntent(preview)) {
    errors.push("InspectorEditIntentPreview requires a targetNodePath unless it is blocked or unsupported.");
  }
  if (preview.requiresSourceLocation !== true) errors.push("InspectorEditIntentPreview.requiresSourceLocation must remain true in Phase 7A.");
  if (preview.canApply !== false) errors.push("InspectorEditIntentPreview.canApply must remain false in Phase 7A.");
  if (preview.status !== "preview-only" && preview.canCreateSourcePatchPreview) {
    errors.push("InspectorEditIntentPreview can only describe Source Patch Preview creation from preview-only status.");
  }
  if ((preview.intentKind === "set-attribute" || preview.intentKind === "remove-attribute") && !preview.attributeName?.trim()) {
    errors.push("Attribute InspectorEditIntentPreview requires attributeName.");
  }
  if (preview.status === INSPECTOR_EDITING_BLOCKED_INTENT_STATUS && !preview.blockedReason?.trim()) {
    warnings.push("Blocked InspectorEditIntentPreview should include a blockedReason.");
  }

  const normalizedPreview: InspectorEditIntentPreview = {
    ...preview,
    intentId: preview.intentId.trim(),
    targetNodePath: preview.targetNodePath.trim(),
    attributeName: preview.attributeName?.trim() || undefined,
    requiresSourceLocation: true,
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeInspectorEditingStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function validateInspectorEditingReadinessPreview(
  preview: InspectorEditingReadinessPreview
): InspectorEditingValidationResult<InspectorEditingReadinessPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.readinessId.trim()) errors.push("InspectorEditingReadinessPreview requires a readinessId.");
  if (!preview.selectedNodePath.trim() && preview.status !== INSPECTOR_EDITING_READINESS_BLOCKED_STATUS) {
    errors.push("InspectorEditingReadinessPreview requires a selectedNodePath unless it is blocked.");
  }
  if (preview.applyAvailable !== false) errors.push("InspectorEditingReadinessPreview.applyAvailable must remain false in Phase 7A.");
  if (!preview.applyBlockedReason.trim()) errors.push("InspectorEditingReadinessPreview requires an applyBlockedReason.");
  if (preview.designEditingReadinessPreview && preview.designEditingReadinessPreview.applyAvailable !== false) {
    errors.push("InspectorEditingReadinessPreview cannot depend on Apply-capable DesignEditingReadinessPreview in Phase 7A.");
  }
  if (preview.designEditingReadinessPreview?.status === "blocked" && preview.status !== INSPECTOR_EDITING_READINESS_BLOCKED_STATUS) {
    errors.push("InspectorEditingReadinessPreview must be blocked when DesignEditingReadinessPreview is blocked.");
  }
  if (preview.commandTransactionPlanPreview && !["preview-only", "blocked", "unsupported"].includes(preview.commandTransactionPlanPreview.status)) {
    errors.push("CommandTransactionPlanPreview reference must remain a preview/planning status.");
  }
  if (preview.status !== INSPECTOR_EDITING_READINESS_BLOCKED_STATUS && preview.missingRequirements.length > 0) {
    warnings.push("InspectorEditingReadinessPreview has missing requirements and should remain blocked.");
  }

  const normalizedPreview: InspectorEditingReadinessPreview = {
    ...preview,
    readinessId: preview.readinessId.trim(),
    selectedNodePath: preview.selectedNodePath.trim(),
    applyAvailable: false,
    applyBlockedReason: preview.applyBlockedReason.trim(),
    missingRequirements: normalizeInspectorEditingStringList(preview.missingRequirements, "missingRequirements", errors),
    safetyNotes: normalizeInspectorEditingStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function normalizeInspectorEditingFileList(values: readonly string[] | undefined, errors: string[] = []): readonly string[] {
  return normalizeInspectorEditingStringList(values ?? [], "affectedFiles", errors).map((value) => value.replace(/\\/g, "/"));
}

export function normalizeInspectorEditingStringList(
  values: readonly string[] | undefined,
  label: string,
  errors: string[] = []
): readonly string[] {
  const normalized = new Set<string>();
  for (const value of values ?? []) {
    const text = value.trim();
    if (!text) {
      errors.push(`${label} cannot contain empty values.`);
      continue;
    }
    normalized.add(text);
  }
  return [...normalized].sort();
}

function isBlockedOrUnsupportedField(preview: InspectorEditableFieldPreview): boolean {
  return preview.status === INSPECTOR_EDITING_BLOCKED_FIELD_STATUS || preview.status === INSPECTOR_EDITING_UNSUPPORTED_FIELD_STATUS;
}

function isBlockedOrUnsupportedIntent(preview: InspectorEditIntentPreview): boolean {
  return preview.status === INSPECTOR_EDITING_BLOCKED_INTENT_STATUS || preview.status === INSPECTOR_EDITING_UNSUPPORTED_INTENT_STATUS;
}
