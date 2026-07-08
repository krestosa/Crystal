export type RefreshBoundaryPlanStatus = "planned" | "blocked" | "unsupported";

export type RefreshInvalidationTarget =
  | "project-graph"
  | "dom-snapshot"
  | "preview-render"
  | "selection-state"
  | "inspector-state"
  | "visual-overlay"
  | "diagnostics";

export interface RefreshBoundaryPlan {
  readonly refreshPlanId: string;
  readonly status: RefreshBoundaryPlanStatus;
  readonly affectedFiles: readonly string[];
  readonly invalidates: readonly RefreshInvalidationTarget[];
  readonly reloadPreview: boolean;
  readonly clearSelection: boolean;
  readonly recomputeSnapshot: boolean;
  readonly recomputeGraph: boolean;
  readonly reason: string;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface RefreshBoundaryPlanInput {
  readonly refreshPlanId: string;
  readonly status?: RefreshBoundaryPlanStatus;
  readonly affectedFiles: readonly string[];
  readonly invalidates?: readonly RefreshInvalidationTarget[];
  readonly reloadPreview?: boolean;
  readonly clearSelection?: boolean;
  readonly recomputeSnapshot?: boolean;
  readonly recomputeGraph?: boolean;
  readonly reason: string;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export interface RefreshBoundaryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPlan?: RefreshBoundaryPlan;
}
