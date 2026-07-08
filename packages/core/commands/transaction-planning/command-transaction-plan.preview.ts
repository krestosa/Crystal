import { COMMAND_PREVIEW_READY_STATUS, type CommandPreviewResult } from "../command-preview-bus";
import { SOURCE_PATCH_READY_STATUS } from "../../source-patch";
import {
  createHistoryTransactionPreview,
  HISTORY_TRANSACTION_BLOCKED_STATUS,
  HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS,
  HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY
} from "../../history";
import { createRefreshBoundaryPlan, REFRESH_BOUNDARY_BLOCKED_STATUS } from "../../refresh-boundary";
import type { CommandTransactionPlanPreview, CommandTransactionPlanPreviewInput } from "./command-transaction-plan.types";
import { validateCommandTransactionPlanPreview } from "./command-transaction-plan.validators";

const COMMAND_TRANSACTION_PLAN_SAFETY_NOTE =
  "Command transaction plans are dry-run coordination previews only; they cannot execute commands, persist files, or change Preview state.";

const FUTURE_WRITE_REQUIREMENTS = [
  "main-owned persistence runtime",
  "atomic source patch application service",
  "conflict detection against fresh source",
  "durable dirty-state policy",
  "real history execution policy",
  "post-write refresh orchestration"
] as const;

export function createCommandTransactionPlanPreview(input: CommandTransactionPlanPreviewInput): CommandTransactionPlanPreview {
  const commandPreviewResult = input.commandPreviewResult;
  const sourcePatchPreview = commandPreviewResult.sourcePatchPreview;
  const affectedFiles = sourcePatchPreview ? [sourcePatchPreview.targetFilePath] : [];
  const blockedReason = createCommandTransactionPlanBlockedReason(commandPreviewResult);
  const status = blockedReason ? "blocked" : "preview-only";
  const reversible = sourcePatchPreview?.reversible ?? false;

  const historyTransactionPreview = createHistoryTransactionPreview({
    transactionId: `${input.planId.trim()}:history`,
    label: `Future transaction for ${commandPreviewResult.commandKind}`,
    status: status === "blocked" ? HISTORY_TRANSACTION_BLOCKED_STATUS : HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS,
    sourcePatchPreview,
    affectedFiles,
    reversible,
    undoStrategy: reversible ? undefined : HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY,
    blockedReason,
    createdAt: input.createdAt,
    safetyNotes: ["Connected to Command Preview Result and Source Patch Preview without execution."]
  });

  const refreshBoundaryPlan = createRefreshBoundaryPlan({
    refreshPlanId: `${input.planId.trim()}:refresh`,
    status: status === "blocked" ? REFRESH_BOUNDARY_BLOCKED_STATUS : undefined,
    affectedFiles,
    reason: `Future write from ${commandPreviewResult.commandKind} would invalidate source-derived state.`,
    blockedReason,
    safetyNotes: ["Connected to Source Patch Preview affected files without triggering a reload."]
  });

  const plan: CommandTransactionPlanPreview = {
    planId: input.planId.trim(),
    commandId: commandPreviewResult.commandId,
    commandKind: commandPreviewResult.commandKind,
    status,
    commandPreviewStatus: commandPreviewResult.status,
    sourcePatchPreviewId: sourcePatchPreview?.patchId,
    sourcePatchStatus: sourcePatchPreview?.status,
    historyTransactionPreview,
    refreshBoundaryPlan,
    affectedFiles: refreshBoundaryPlan.affectedFiles,
    reversible,
    invalidates: refreshBoundaryPlan.invalidates,
    blockedReason,
    futureRequirements: FUTURE_WRITE_REQUIREMENTS,
    safetyNotes: [COMMAND_TRANSACTION_PLAN_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateCommandTransactionPlanPreview(plan);
  return validation.normalizedPlan ?? plan;
}

function createCommandTransactionPlanBlockedReason(result: CommandPreviewResult): string | undefined {
  if (result.status !== COMMAND_PREVIEW_READY_STATUS) {
    return `Command Preview Result is ${result.status}, so transaction planning is blocked.`;
  }

  if (!result.sourcePatchPreview) {
    return "Command Preview Result does not include a Source Patch Preview.";
  }

  if (result.sourcePatchPreview.status !== SOURCE_PATCH_READY_STATUS) {
    return `Source Patch Preview is ${result.sourcePatchPreview.status}, so transaction planning is blocked.`;
  }

  if (!result.sourcePatchPreview.targetFilePath.trim()) {
    return "Source Patch Preview does not identify an affected file.";
  }

  return undefined;
}
