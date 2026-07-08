import { validateHistoryTransactionPreview } from "../../history";
import { validateRefreshBoundaryPlan } from "../../refresh-boundary";
import type {
  CommandTransactionPlanPreview,
  CommandTransactionPlanPreviewStatus,
  CommandTransactionPlanValidationResult
} from "./command-transaction-plan.types";

const ALLOWED_PLAN_STATUSES: readonly CommandTransactionPlanPreviewStatus[] = ["preview-only", "blocked", "unsupported"];

export function validateCommandTransactionPlanPreview(plan: CommandTransactionPlanPreview): CommandTransactionPlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const planId = plan.planId.trim();
  const commandId = plan.commandId.trim();
  const commandKind = plan.commandKind.trim();
  const blockedReason = plan.blockedReason?.trim();

  if (!planId) errors.push("planId is required.");
  if (!commandId) errors.push("commandId is required.");
  if (!commandKind) errors.push("commandKind is required.");
  if (!ALLOWED_PLAN_STATUSES.includes(plan.status)) errors.push(`Unsupported command transaction plan status: ${plan.status}.`);

  if (plan.status === "blocked" && !blockedReason) errors.push("blocked command transaction plans require blockedReason.");
  if (plan.status === "preview-only" && plan.affectedFiles.length === 0) errors.push("preview-only command transaction plans require affectedFiles.");
  if (plan.futureRequirements.length === 0) warnings.push("Command transaction plan should describe future requirements before execution exists.");
  if (plan.safetyNotes.length === 0) warnings.push("Command transaction plan should include at least one safety note.");

  const historyValidation = validateHistoryTransactionPreview(plan.historyTransactionPreview);
  const refreshValidation = validateRefreshBoundaryPlan(plan.refreshBoundaryPlan);

  for (const error of historyValidation.errors) errors.push(`historyTransactionPreview: ${error}`);
  for (const error of refreshValidation.errors) errors.push(`refreshBoundaryPlan: ${error}`);
  warnings.push(...historyValidation.warnings.map((warning) => `historyTransactionPreview: ${warning}`));
  warnings.push(...refreshValidation.warnings.map((warning) => `refreshBoundaryPlan: ${warning}`));

  const normalizedPlan: CommandTransactionPlanPreview | undefined = errors.length === 0
    ? {
        ...plan,
        planId,
        commandId,
        commandKind,
        blockedReason,
        historyTransactionPreview: historyValidation.normalizedPreview ?? plan.historyTransactionPreview,
        refreshBoundaryPlan: refreshValidation.normalizedPlan ?? plan.refreshBoundaryPlan,
        safetyNotes: plan.safetyNotes.map((note) => note.trim()).filter(Boolean),
        futureRequirements: plan.futureRequirements.map((requirement) => requirement.trim()).filter(Boolean)
      }
    : undefined;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedPlan
  };
}
