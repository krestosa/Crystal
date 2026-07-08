import {
  INSPECTOR_EDITING_APPLY_BLOCKED_REASON,
  INSPECTOR_EDITING_MISSING_REQUIREMENTS,
  INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE,
  INSPECTOR_EDITING_READINESS_BLOCKED_STATUS,
  INSPECTOR_EDITING_READINESS_PREVIEW_ONLY_STATUS,
  INSPECTOR_EDITING_READINESS_UNSUPPORTED_STATUS
} from "./inspector-editing.constants";
import type {
  InspectorEditingReadinessPreview,
  InspectorEditingReadinessPreviewInput,
  InspectorEditingReadinessStatus
} from "./inspector-editing.types";
import { normalizeInspectorEditingStringList, validateInspectorEditingReadinessPreview } from "./inspector-editing.validators";

export function createInspectorEditingReadinessPreview(input: InspectorEditingReadinessPreviewInput): InspectorEditingReadinessPreview {
  const selectedNodePath = (input.selectedNodePath ?? input.draftPreview.selectedNodePath ?? "").trim();
  const missingRequirements = collectMissingRequirements(input, selectedNodePath);
  const status = resolveReadinessStatus(input, missingRequirements);
  const applyBlockedReason = input.designEditingReadinessPreview?.applyBlockedReason.trim() || INSPECTOR_EDITING_APPLY_BLOCKED_REASON;

  const preview: InspectorEditingReadinessPreview = {
    readinessId: input.readinessId.trim(),
    status,
    selectedNodePath,
    draftPreview: input.draftPreview,
    intentPreviews: input.intentPreviews ?? [],
    commandTransactionPlanPreview: input.commandTransactionPlanPreview,
    designEditingReadinessPreview: input.designEditingReadinessPreview,
    applyAvailable: false,
    applyBlockedReason,
    missingRequirements,
    safetyNotes: [INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateInspectorEditingReadinessPreview(preview);
  return validation.normalizedPreview ?? preview;
}

function collectMissingRequirements(input: InspectorEditingReadinessPreviewInput, selectedNodePath: string): readonly string[] {
  const missing: string[] = [];
  if (!input.readinessId.trim()) missing.push("readinessId");
  if (!selectedNodePath) missing.push(INSPECTOR_EDITING_MISSING_REQUIREMENTS[1]);
  if (input.trustedSelection !== true) missing.push(INSPECTOR_EDITING_MISSING_REQUIREMENTS[0]);
  if (input.hasSourceLocation !== true) missing.push(INSPECTOR_EDITING_MISSING_REQUIREMENTS[2]);
  if (!input.commandTransactionPlanPreview) missing.push(INSPECTOR_EDITING_MISSING_REQUIREMENTS[3]);
  if (!input.designEditingReadinessPreview) missing.push(INSPECTOR_EDITING_MISSING_REQUIREMENTS[4]);
  if (input.designEditingReadinessPreview?.status === "blocked") missing.push("DesignEditingReadinessPreview is blocked");
  return normalizeInspectorEditingStringList(missing, "missingRequirements");
}

function resolveReadinessStatus(
  input: InspectorEditingReadinessPreviewInput,
  missingRequirements: readonly string[]
): InspectorEditingReadinessStatus {
  if (input.intentPreviews?.some((intent) => intent.status === INSPECTOR_EDITING_READINESS_UNSUPPORTED_STATUS)) {
    return INSPECTOR_EDITING_READINESS_UNSUPPORTED_STATUS;
  }

  if (input.draftPreview.status === "unsupported") return INSPECTOR_EDITING_READINESS_UNSUPPORTED_STATUS;
  if (input.designEditingReadinessPreview?.status === "blocked") return INSPECTOR_EDITING_READINESS_BLOCKED_STATUS;
  if (missingRequirements.length > 0) return INSPECTOR_EDITING_READINESS_BLOCKED_STATUS;
  return INSPECTOR_EDITING_READINESS_PREVIEW_ONLY_STATUS;
}
