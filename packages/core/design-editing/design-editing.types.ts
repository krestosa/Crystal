import type { CommandTransactionPlanPreview } from "../commands/transaction-planning";
import type { DirtyStatePreview } from "../dirty-state";
import type { SourceConflictPreview } from "../source-conflict";
import type { WriteRuntimeCapabilityPreview } from "../write-runtime";

export type DesignEditingReadinessStatus = "blocked" | "preview-only" | "unsupported";
export type DesignEditingFutureRequirement =
  | "write-capable main/core command runtime"
  | "atomic source patch application"
  | "write IPC with explicit authorization"
  | "dirty-state persistence policy"
  | "source freshness and conflict detector"
  | "refresh executor after successful writes"
  | "durable transaction records"
  | "undo/redo execution policy";

export interface DesignEditingReadinessPreview {
  readonly readinessId: string;
  readonly status: DesignEditingReadinessStatus;
  readonly applyAvailable: false;
  readonly applyBlockedReason: string;
  readonly affectedFiles: readonly string[];
  readonly transactionPlanPreview?: CommandTransactionPlanPreview;
  readonly dirtyStatePreview: DirtyStatePreview;
  readonly sourceConflictPreview: SourceConflictPreview;
  readonly writeRuntimeCapabilityPreview: WriteRuntimeCapabilityPreview;
  readonly futureRequirements: readonly DesignEditingFutureRequirement[];
  readonly safetyNotes: readonly string[];
}

export interface DesignEditingReadinessPreviewInput {
  readonly readinessId: string;
  readonly transactionPlanPreview?: CommandTransactionPlanPreview;
  readonly dirtyStatePreview?: DirtyStatePreview;
  readonly sourceConflictPreview?: SourceConflictPreview;
  readonly writeRuntimeCapabilityPreview?: WriteRuntimeCapabilityPreview;
  readonly futureRequirements?: readonly DesignEditingFutureRequirement[];
  readonly safetyNotes?: readonly string[];
}

export interface DesignEditingReadinessValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: DesignEditingReadinessPreview;
}
