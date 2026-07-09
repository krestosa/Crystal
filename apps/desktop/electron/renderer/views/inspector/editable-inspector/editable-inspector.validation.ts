import type { EditableInspectorSurfaceModel } from "./editable-inspector.types";

export interface EditableInspectorSurfaceValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateEditableInspectorSurfaceModel(model: EditableInspectorSurfaceModel): EditableInspectorSurfaceValidationResult {
  const errors: string[] = [];
  if (model.applyDisabled !== true) errors.push("Editable Inspector Apply affordance must remain disabled.");
  if (model.readinessPreview.applyAvailable !== false) errors.push("InspectorEditingReadinessPreview must keep applyAvailable false.");
  if (model.draftPreview.applyAvailable !== false) errors.push("InspectorEditDraftPreview must keep applyAvailable false.");

  for (const field of model.fields) {
    if (field.controlReadOnly !== true) errors.push(`${field.field.fieldId} must render as readonly.`);
    if (field.controlDisabled !== true) errors.push(`${field.field.fieldId} must render as disabled.`);
    if (field.field.canApply !== false) errors.push(`${field.field.fieldId} must keep canApply false.`);
  }

  for (const intent of model.intents) {
    if (intent.intent.canApply !== false) errors.push(`${intent.intent.intentId} must keep canApply false.`);
  }

  return { valid: errors.length === 0, errors };
}
