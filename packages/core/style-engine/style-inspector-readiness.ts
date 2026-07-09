import {
  SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS,
  SELECTED_NODE_STYLE_READINESS_INVENTORY_ONLY_STATUS,
  SELECTED_NODE_STYLE_READINESS_UNSUPPORTED_STATUS,
  STYLE_ENGINE_APPLY_BLOCKED_REASON,
  STYLE_ENGINE_COMPUTED_STYLE_BLOCKED_REASON,
  STYLE_ENGINE_MISSING_REQUIREMENTS,
  STYLE_ENGINE_READONLY_SAFETY_NOTE
} from "./style-engine.constants";
import type {
  SelectedNodeStyleReadinessPreview,
  SelectedNodeStyleReadinessPreviewInput,
  SelectedNodeStyleReadinessStatus
} from "./style-engine.types";
import { normalizeStyleEngineStringList, validateSelectedNodeStyleReadinessPreview } from "./style-engine.validators";

export function createSelectedNodeStyleReadinessPreview(
  input: SelectedNodeStyleReadinessPreviewInput
): SelectedNodeStyleReadinessPreview {
  const selectedNodePath = input.selectedNodePath?.trim() ?? "";
  const targetRelativePath = normalizeReadinessPath(input.targetRelativePath ?? input.inventoryPreview.targetRelativePath);
  const missingRequirements = collectMissingRequirements(input, selectedNodePath, targetRelativePath);
  const canInspectAuthoredStyles = missingRequirements.length === 0 && hasInspectableInventory(input.inventoryPreview.status);
  const status = resolveSelectedNodeStyleReadinessStatus(input, missingRequirements, canInspectAuthoredStyles);
  const blockedReason = input.blockedReason?.trim() || resolveBlockedReason(status);

  const preview: SelectedNodeStyleReadinessPreview = {
    readinessId: input.readinessId.trim(),
    selectedNodePath,
    targetRelativePath,
    inventoryPreview: input.inventoryPreview,
    inspectorEditingReadinessPreview: input.inspectorEditingReadinessPreview,
    status,
    canInspectComputedStyles: false,
    canInspectAuthoredStyles,
    canEditStyles: false,
    canApply: false,
    missingRequirements,
    blockedReason,
    safetyNotes: [STYLE_ENGINE_READONLY_SAFETY_NOTE, STYLE_ENGINE_COMPUTED_STYLE_BLOCKED_REASON, ...(input.safetyNotes ?? [])]
  };

  const validation = validateSelectedNodeStyleReadinessPreview(preview);
  return validation.normalizedPreview ?? preview;
}

function collectMissingRequirements(
  input: SelectedNodeStyleReadinessPreviewInput,
  selectedNodePath: string,
  targetRelativePath: string
): readonly string[] {
  const missing: string[] = [];
  if (!input.readinessId.trim()) missing.push("readinessId");
  if (!selectedNodePath) missing.push(STYLE_ENGINE_MISSING_REQUIREMENTS[1]);
  if (!targetRelativePath) missing.push("targetRelativePath");
  if (input.trustedSelection !== true) missing.push(STYLE_ENGINE_MISSING_REQUIREMENTS[0]);
  if (input.hasDomSnapshot !== true) missing.push(STYLE_ENGINE_MISSING_REQUIREMENTS[1]);
  if (input.inventoryPreview.status === "blocked" || input.inventoryPreview.status === "empty") {
    missing.push(STYLE_ENGINE_MISSING_REQUIREMENTS[2]);
  }
  return normalizeStyleEngineStringList(missing, "missingRequirements");
}

function resolveSelectedNodeStyleReadinessStatus(
  input: SelectedNodeStyleReadinessPreviewInput,
  missingRequirements: readonly string[],
  canInspectAuthoredStyles: boolean
): SelectedNodeStyleReadinessStatus {
  if (input.inventoryPreview.status === "empty") return SELECTED_NODE_STYLE_READINESS_UNSUPPORTED_STATUS;
  if (input.inventoryPreview.status === "blocked") return SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS;
  if (missingRequirements.length > 0) return SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS;
  if (canInspectAuthoredStyles) return SELECTED_NODE_STYLE_READINESS_INVENTORY_ONLY_STATUS;
  return SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS;
}

function hasInspectableInventory(status: string): boolean {
  return status === "discovered" || status === "partial";
}

function resolveBlockedReason(status: SelectedNodeStyleReadinessStatus): string | undefined {
  if (status === SELECTED_NODE_STYLE_READINESS_INVENTORY_ONLY_STATUS) return STYLE_ENGINE_APPLY_BLOCKED_REASON;
  if (status === SELECTED_NODE_STYLE_READINESS_UNSUPPORTED_STATUS) return "No authored style inventory is available for the selected node.";
  return "Style Inspector readiness is blocked until trusted selection, DOM Snapshot mapping, and style source inventory are available.";
}

function normalizeReadinessPath(value: string): string {
  return value.trim().replace(/\\/g, "/");
}
