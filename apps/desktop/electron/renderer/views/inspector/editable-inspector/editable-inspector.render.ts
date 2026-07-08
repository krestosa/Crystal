import { createEditableInspectorSurfaceModel } from "./editable-inspector.model";
import type { EditableInspectorFieldSurfaceModel, EditableInspectorIntentSurfaceModel, EditableInspectorSurfaceElements } from "./editable-inspector.types";
import { validateEditableInspectorSurfaceModel } from "./editable-inspector.validation";
import type { InspectorEditingReadOnlySurfaceViewModel } from "../../../../../../../packages/core/inspector-editing";
import {
  EDITABLE_INSPECTOR_APPLY_LABEL,
  EDITABLE_INSPECTOR_DISABLED_CONTROL_NOTE,
  EDITABLE_INSPECTOR_EMPTY_FIELDS,
  EDITABLE_INSPECTOR_EMPTY_INTENTS
} from "./editable-inspector.constants";

export function renderEditableInspectorSurface(elements: EditableInspectorSurfaceElements, viewModel: InspectorEditingReadOnlySurfaceViewModel): void {
  const model = createEditableInspectorSurfaceModel(viewModel);
  const validation = validateEditableInspectorSurfaceModel(model);

  elements.editableInspectorStatus.textContent = model.statusLabel;
  elements.editableInspectorMessage.textContent = validation.valid ? model.message : validation.errors.join(" · ");
  elements.editableInspectorApply.textContent = EDITABLE_INSPECTOR_APPLY_LABEL;
  elements.editableInspectorApply.disabled = true;
  elements.editableInspectorApply.setAttribute("aria-disabled", "true");

  renderReadiness(elements.editableInspectorReadiness, model);
  renderFields(elements, model.fields);
  renderIntents(elements, model.intents);
}

function renderReadiness(container: HTMLDListElement, model: ReturnType<typeof createEditableInspectorSurfaceModel>): void {
  container.replaceChildren(
    createDetailRow("Readiness", model.readinessPreview.status),
    createDetailRow("Apply", model.readinessPreview.applyAvailable ? "unexpected" : "unavailable"),
    createDetailRow("Blocked", model.readinessPreview.applyBlockedReason),
    createDetailRow("Missing", model.missingRequirementSummary),
    createDetailRow("Changed fields", model.changedFieldSummary),
    createDetailRow("Draft", model.draftPreview.status)
  );
}

function renderFields(elements: EditableInspectorSurfaceElements, fields: readonly EditableInspectorFieldSurfaceModel[]): void {
  elements.editableInspectorFieldsEmpty.hidden = fields.length > 0;
  elements.editableInspectorFieldsEmpty.textContent = EDITABLE_INSPECTOR_EMPTY_FIELDS;
  elements.editableInspectorFields.replaceChildren(...fields.map(createFieldRow));
}

function createFieldRow(field: EditableInspectorFieldSurfaceModel): HTMLElement {
  const row = document.createElement("label");
  row.className = "crystal-project-preview-panel__editable-field";

  const heading = document.createElement("span");
  heading.className = "crystal-project-preview-panel__editable-field-label";
  heading.textContent = field.field.label;

  const input = document.createElement("input");
  input.className = "crystal-project-preview-panel__editable-field-control";
  input.type = "text";
  input.value = field.controlValue;
  input.readOnly = true;
  input.disabled = true;
  input.setAttribute("aria-readonly", "true");
  input.setAttribute("aria-label", `${field.field.label} disabled preview value`);

  const meta = document.createElement("span");
  meta.className = "crystal-project-preview-panel__editable-field-meta";
  meta.textContent = `${field.statusLabel} · ${field.blockedReason} · ${EDITABLE_INSPECTOR_DISABLED_CONTROL_NOTE}`;

  row.append(heading, input, meta);
  return row;
}

function renderIntents(elements: EditableInspectorSurfaceElements, intents: readonly EditableInspectorIntentSurfaceModel[]): void {
  elements.editableInspectorIntentsEmpty.hidden = intents.length > 0;
  elements.editableInspectorIntentsEmpty.textContent = EDITABLE_INSPECTOR_EMPTY_INTENTS;
  elements.editableInspectorIntents.replaceChildren(...intents.map(createIntentItem));
}

function createIntentItem(intent: EditableInspectorIntentSurfaceModel): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "crystal-project-preview-panel__editable-intent";

  const label = document.createElement("span");
  label.className = "crystal-project-preview-panel__editable-intent-label";
  label.textContent = intent.label;

  const status = document.createElement("span");
  status.className = "crystal-project-preview-panel__editable-intent-status";
  status.textContent = `${intent.statusLabel} · ${intent.blockedReason}`;

  item.append(label, status);
  return item;
}

function createDetailRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  row.append(term, description);
  return row;
}
