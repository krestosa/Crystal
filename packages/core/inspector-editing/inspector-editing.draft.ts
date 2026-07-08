import {
  INSPECTOR_EDITING_BLOCKED_DRAFT_STATUS,
  INSPECTOR_EDITING_DRAFT_PREVIEW_STATUS,
  INSPECTOR_EDITING_EMPTY_DRAFT_STATUS,
  INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE,
  INSPECTOR_EDITING_UNSUPPORTED_DRAFT_STATUS
} from "./inspector-editing.constants";
import type { InspectorEditDraftPreview, InspectorEditDraftPreviewInput, InspectorEditDraftStatus } from "./inspector-editing.types";
import { normalizeInspectorEditingStringList, validateInspectorEditDraftPreview } from "./inspector-editing.validators";

export function createInspectorEditDraftPreview(input: InspectorEditDraftPreviewInput): InspectorEditDraftPreview {
  const selectedNodePath = (input.selectedNodePath ?? "").trim();
  const fields = input.fields ?? [];
  const changedFieldIds = fields
    .filter((field) => field.currentValue !== field.draftValue)
    .map((field) => field.fieldId);
  const blockedReason = createDraftBlockedReason(input, selectedNodePath);
  const affectedFiles = normalizeInspectorEditingStringList(input.affectedFiles ?? [], "affectedFiles");
  const status = resolveDraftStatus(fields.length, changedFieldIds.length, blockedReason);

  const preview: InspectorEditDraftPreview = {
    draftId: input.draftId.trim(),
    selectedNodePath,
    snapshotVersion: (input.snapshotVersion ?? "unknown").trim(),
    status,
    fields,
    changedFieldIds,
    affectedFiles,
    sourcePatchPreviewId: input.sourcePatchPreviewId?.trim() || undefined,
    transactionPlanPreviewId: input.transactionPlanPreviewId?.trim() || undefined,
    readinessPreviewId: input.readinessPreviewId?.trim() || undefined,
    applyAvailable: false,
    blockedReason,
    safetyNotes: [INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateInspectorEditDraftPreview(preview);
  return validation.normalizedPreview ?? preview;
}

function createDraftBlockedReason(input: InspectorEditDraftPreviewInput, selectedNodePath: string): string | undefined {
  if (input.blockedReason?.trim()) return input.blockedReason.trim();
  if (!input.draftId.trim()) return "Inspector edit draft requires a draftId.";
  if (!selectedNodePath) return "Inspector edit draft requires a selectedNodePath from a trusted selection.";
  if (input.trustedSelection === false) return "Inspector edit draft is blocked because the selection is not trusted.";
  return undefined;
}

function resolveDraftStatus(fieldCount: number, changedFieldCount: number, blockedReason: string | undefined): InspectorEditDraftStatus {
  if (blockedReason) return INSPECTOR_EDITING_BLOCKED_DRAFT_STATUS;
  if (fieldCount === 0) return INSPECTOR_EDITING_EMPTY_DRAFT_STATUS;
  if (changedFieldCount > 0) return INSPECTOR_EDITING_DRAFT_PREVIEW_STATUS;
  return INSPECTOR_EDITING_EMPTY_DRAFT_STATUS;
}

export function createUnsupportedInspectorEditDraftPreview(input: InspectorEditDraftPreviewInput): InspectorEditDraftPreview {
  const draft = createInspectorEditDraftPreview({
    ...input,
    blockedReason: input.blockedReason ?? "Inspector edit draft is unsupported for this selected node in Phase 7A."
  });

  return {
    ...draft,
    status: INSPECTOR_EDITING_UNSUPPORTED_DRAFT_STATUS,
    applyAvailable: false
  };
}
