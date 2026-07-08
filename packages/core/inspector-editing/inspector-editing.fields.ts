import {
  INSPECTOR_EDITING_BLOCKED_FIELD_STATUS,
  INSPECTOR_EDITING_DRAFTABLE_FIELD_STATUS,
  INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE,
  INSPECTOR_EDITING_READONLY_FIELD_STATUS,
  INSPECTOR_EDITING_UNSUPPORTED_FIELD_STATUS
} from "./inspector-editing.constants";
import type {
  InspectorEditableFieldKind,
  InspectorEditableFieldPreview,
  InspectorEditableFieldPreviewInput,
  InspectorEditableFieldStatus
} from "./inspector-editing.types";
import { validateInspectorEditableFieldPreview } from "./inspector-editing.validators";

export function createInspectorEditableFieldPreview(input: InspectorEditableFieldPreviewInput): InspectorEditableFieldPreview {
  const fieldKind = input.fieldKind;
  const nodePath = (input.nodePath ?? "").trim();
  const currentValue = input.currentValue ?? "";
  const draftValue = input.draftValue ?? currentValue;
  const blockedReason = createFieldBlockedReason(input, nodePath);
  const status = resolveFieldStatus(fieldKind, input.status, blockedReason, input.canDraft);
  const canDraft = status === INSPECTOR_EDITING_DRAFTABLE_FIELD_STATUS && input.canDraft !== false;

  const preview: InspectorEditableFieldPreview = {
    fieldId: input.fieldId.trim(),
    nodePath,
    fieldKind,
    label: input.label.trim(),
    currentValue,
    draftValue,
    status,
    canDraft,
    canApply: false,
    blockedReason,
    safetyNotes: [INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateInspectorEditableFieldPreview(preview);
  return validation.normalizedPreview ?? preview;
}

function createFieldBlockedReason(input: InspectorEditableFieldPreviewInput, nodePath: string): string | undefined {
  if (input.blockedReason?.trim()) return input.blockedReason.trim();
  if (!input.fieldId.trim()) return "Inspector editable field requires a fieldId.";
  if (!nodePath) return "Inspector editable field requires a trusted nodePath.";
  if (!input.label.trim()) return "Inspector editable field requires a label.";
  if (isUnsupportedFieldKind(input.fieldKind)) return `${input.fieldKind} is not modeled as a draftable Inspector field in Phase 7A.`;
  return undefined;
}

function resolveFieldStatus(
  fieldKind: InspectorEditableFieldKind,
  inputStatus: InspectorEditableFieldStatus | undefined,
  blockedReason: string | undefined,
  canDraft: boolean | undefined
): InspectorEditableFieldStatus {
  if (blockedReason) {
    return isUnsupportedFieldKind(fieldKind) ? INSPECTOR_EDITING_UNSUPPORTED_FIELD_STATUS : INSPECTOR_EDITING_BLOCKED_FIELD_STATUS;
  }

  if (inputStatus === INSPECTOR_EDITING_UNSUPPORTED_FIELD_STATUS || !isDraftSupportedFieldKind(fieldKind)) {
    return INSPECTOR_EDITING_UNSUPPORTED_FIELD_STATUS;
  }

  if (canDraft === false || inputStatus === INSPECTOR_EDITING_READONLY_FIELD_STATUS) {
    return INSPECTOR_EDITING_READONLY_FIELD_STATUS;
  }

  return INSPECTOR_EDITING_DRAFTABLE_FIELD_STATUS;
}

function isDraftSupportedFieldKind(fieldKind: InspectorEditableFieldKind): boolean {
  return fieldKind === "text-content" || fieldKind === "attribute";
}

function isUnsupportedFieldKind(fieldKind: InspectorEditableFieldKind): boolean {
  return fieldKind === "tag-name" || fieldKind === "class-list" || fieldKind === "inline-style";
}
