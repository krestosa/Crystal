import type { CommandPreviewResult } from "../command-preview-bus";
import type { HistoryTransactionPreview } from "../../history";
import type { RefreshBoundaryPlan, RefreshInvalidationTarget } from "../../refresh-boundary";

export type CommandTransactionPlanPreviewStatus = "preview-only" | "blocked" | "unsupported";

export interface CommandTransactionPlanPreview {
  readonly planId: string;
  readonly commandId: string;
  readonly commandKind: string;
  readonly status: CommandTransactionPlanPreviewStatus;
  readonly commandPreviewStatus: CommandPreviewResult["status"];
  readonly sourcePatchPreviewId?: string;
  readonly sourcePatchStatus?: string;
  readonly historyTransactionPreview: HistoryTransactionPreview;
  readonly refreshBoundaryPlan: RefreshBoundaryPlan;
  readonly affectedFiles: readonly string[];
  readonly reversible: boolean;
  readonly invalidates: readonly RefreshInvalidationTarget[];
  readonly blockedReason?: string;
  readonly futureRequirements: readonly string[];
  readonly safetyNotes: readonly string[];
}

export interface CommandTransactionPlanPreviewInput {
  readonly planId: string;
  readonly commandPreviewResult: CommandPreviewResult;
  readonly createdAt?: string;
  readonly safetyNotes?: readonly string[];
}

export interface CommandTransactionPlanValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPlan?: CommandTransactionPlanPreview;
}
