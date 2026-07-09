import type {
  InspectorEditableFieldPreview,
  InspectorEditDraftPreview,
  InspectorEditIntentPreview,
  InspectorEditingReadinessPreview,
  InspectorEditingReadOnlySurfaceViewModel
} from "../../../../../../../packages/core/inspector-editing";

export interface EditableInspectorSurfaceElements {
  readonly editableInspectorStatus: HTMLElement;
  readonly editableInspectorMessage: HTMLElement;
  readonly editableInspectorReadiness: HTMLDListElement;
  readonly editableInspectorFields: HTMLElement;
  readonly editableInspectorFieldsEmpty: HTMLElement;
  readonly editableInspectorIntents: HTMLUListElement;
  readonly editableInspectorIntentsEmpty: HTMLElement;
  readonly editableInspectorApplyUnavailableAffordance: HTMLElement;
}

export interface EditableInspectorFieldSurfaceModel {
  readonly field: InspectorEditableFieldPreview;
  readonly controlValue: string;
  readonly controlReadOnly: true;
  readonly controlDisabled: true;
  readonly statusLabel: string;
  readonly blockedReason: string;
}

export interface EditableInspectorIntentSurfaceModel {
  readonly intent: InspectorEditIntentPreview;
  readonly label: string;
  readonly statusLabel: string;
  readonly blockedReason: string;
}

export interface EditableInspectorSurfaceModel {
  readonly source: InspectorEditingReadOnlySurfaceViewModel;
  readonly draftPreview: InspectorEditDraftPreview;
  readonly readinessPreview: InspectorEditingReadinessPreview;
  readonly fields: readonly EditableInspectorFieldSurfaceModel[];
  readonly intents: readonly EditableInspectorIntentSurfaceModel[];
  readonly statusLabel: string;
  readonly message: string;
  readonly applyLabel: string;
  readonly applyDisabled: true;
  readonly changedFieldSummary: string;
  readonly missingRequirementSummary: string;
}
