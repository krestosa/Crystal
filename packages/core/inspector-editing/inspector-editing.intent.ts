import {
  INSPECTOR_EDITING_BLOCKED_INTENT_STATUS,
  INSPECTOR_EDITING_PREVIEW_ONLY_INTENT_STATUS,
  INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE,
  INSPECTOR_EDITING_UNSUPPORTED_INTENT_STATUS
} from "./inspector-editing.constants";
import type { InspectorEditIntentPreview, InspectorEditIntentPreviewInput, InspectorEditIntentStatus } from "./inspector-editing.types";
import { validateInspectorEditIntentPreview } from "./inspector-editing.validators";

export function createInspectorEditIntentPreview(input: InspectorEditIntentPreviewInput): InspectorEditIntentPreview {
  const targetNodePath = (input.targetNodePath ?? "").trim();
  const intentKind = input.intentKind;
  const blockedReason = createIntentBlockedReason(input, targetNodePath);
  const status = resolveIntentStatus(intentKind, blockedReason);
  const canCreateSourcePatchPreview = status === INSPECTOR_EDITING_PREVIEW_ONLY_INTENT_STATUS && input.hasSourceLocation === true;

  const preview: InspectorEditIntentPreview = {
    intentId: input.intentId.trim(),
    intentKind,
    targetNodePath,
    attributeName: input.attributeName?.trim() || undefined,
    currentValue: input.currentValue ?? "",
    nextValue: input.nextValue,
    status,
    requiresSourceLocation: true,
    canCreateSourcePatchPreview,
    canApply: false,
    blockedReason,
    safetyNotes: [INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateInspectorEditIntentPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function createInspectorTextEditIntentPreview(input: Omit<InspectorEditIntentPreviewInput, "intentKind">): InspectorEditIntentPreview {
  return createInspectorEditIntentPreview({ ...input, intentKind: "update-text" });
}

export function createInspectorAttributeSetIntentPreview(input: Omit<InspectorEditIntentPreviewInput, "intentKind">): InspectorEditIntentPreview {
  return createInspectorEditIntentPreview({ ...input, intentKind: "set-attribute" });
}

export function createInspectorAttributeRemoveIntentPreview(input: Omit<InspectorEditIntentPreviewInput, "intentKind" | "nextValue">): InspectorEditIntentPreview {
  return createInspectorEditIntentPreview({ ...input, intentKind: "remove-attribute", nextValue: undefined });
}

function createIntentBlockedReason(input: InspectorEditIntentPreviewInput, targetNodePath: string): string | undefined {
  if (input.blockedReason?.trim()) return input.blockedReason.trim();
  if (!input.intentId.trim()) return "Inspector edit intent requires an intentId.";
  if (!targetNodePath) return "Inspector edit intent requires a targetNodePath from a trusted selection.";
  if (input.intentKind === "unsupported") return "Inspector edit intent kind is unsupported in Phase 7A.";
  if ((input.intentKind === "set-attribute" || input.intentKind === "remove-attribute") && !input.attributeName?.trim()) {
    return "Attribute edit intent requires an attributeName.";
  }
  if (input.hasSourceLocation !== true) return "Inspector edit intent requires sourceLocation before a future Source Patch Preview can be described.";
  return undefined;
}

function resolveIntentStatus(intentKind: InspectorEditIntentPreviewInput["intentKind"], blockedReason: string | undefined): InspectorEditIntentStatus {
  if (intentKind === "unsupported") return INSPECTOR_EDITING_UNSUPPORTED_INTENT_STATUS;
  if (blockedReason) return INSPECTOR_EDITING_BLOCKED_INTENT_STATUS;
  return INSPECTOR_EDITING_PREVIEW_ONLY_INTENT_STATUS;
}
