import type { InspectorEditIntentPreview } from "../../../../../../../packages/core/inspector-editing";
import { EDITABLE_INSPECTOR_APPLY_LABEL } from "./editable-inspector.constants";
import type {
  EditableInspectorFieldSurfaceModel,
  EditableInspectorIntentSurfaceModel,
  EditableInspectorSurfaceModel
} from "./editable-inspector.types";
import type { InspectorEditingReadOnlySurfaceViewModel } from "../../../../../../../packages/core/inspector-editing";

export function createEditableInspectorSurfaceModel(viewModel: InspectorEditingReadOnlySurfaceViewModel): EditableInspectorSurfaceModel {
  return {
    source: viewModel,
    draftPreview: viewModel.draftPreview,
    readinessPreview: viewModel.readinessPreview,
    fields: viewModel.draftPreview.fields.map(createFieldSurfaceModel),
    intents: viewModel.intentPreviews.map(createIntentSurfaceModel),
    statusLabel: createStatusLabel(viewModel.readinessPreview.status),
    message: viewModel.message,
    applyLabel: EDITABLE_INSPECTOR_APPLY_LABEL,
    applyDisabled: true,
    changedFieldSummary: createChangedFieldSummary(viewModel.draftPreview.changedFieldIds),
    missingRequirementSummary: createMissingRequirementSummary(viewModel.readinessPreview.missingRequirements)
  };
}

function createFieldSurfaceModel(field: EditableInspectorFieldSurfaceModel["field"]): EditableInspectorFieldSurfaceModel {
  return {
    field,
    controlValue: field.draftValue,
    controlReadOnly: true,
    controlDisabled: true,
    statusLabel: `${field.fieldKind} · ${field.status}`,
    blockedReason: field.blockedReason ?? "Read-only Phase 7B preview; editing input is disabled."
  };
}

function createIntentSurfaceModel(intent: InspectorEditIntentPreview): EditableInspectorIntentSurfaceModel {
  return {
    intent,
    label: createIntentLabel(intent),
    statusLabel: `${intent.intentKind} · ${intent.status}`,
    blockedReason: intent.blockedReason ?? "Preview-only intent; Apply is unavailable."
  };
}

function createIntentLabel(intent: InspectorEditIntentPreview): string {
  if (intent.intentKind === "update-text") return "Text update intent";
  if (intent.intentKind === "set-attribute") return `Set ${intent.attributeName ?? "attribute"}`;
  if (intent.intentKind === "remove-attribute") return `Remove ${intent.attributeName ?? "attribute"}`;
  return "Unsupported intent";
}

function createStatusLabel(status: string): string {
  if (status === "preview-only") return "preview-only · Apply blocked";
  if (status === "unsupported") return "unsupported · Apply blocked";
  return "blocked · Apply unavailable";
}

function createChangedFieldSummary(changedFieldIds: readonly string[]): string {
  if (changedFieldIds.length === 0) return "No changed fields.";
  return changedFieldIds.join(", ");
}

function createMissingRequirementSummary(missingRequirements: readonly string[]): string {
  if (missingRequirements.length === 0) return "Apply still unavailable by Phase 7B boundary.";
  return missingRequirements.join(" · ");
}
