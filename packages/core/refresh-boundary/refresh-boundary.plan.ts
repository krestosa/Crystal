import {
  DEFAULT_SOURCE_PATCH_REFRESH_INVALIDATIONS,
  REFRESH_BOUNDARY_BLOCKED_STATUS,
  REFRESH_BOUNDARY_PLANNED_STATUS,
  REFRESH_BOUNDARY_PREVIEW_SAFETY_NOTE
} from "./refresh-boundary.constants";
import type { RefreshBoundaryPlan, RefreshBoundaryPlanInput } from "./refresh-boundary.types";
import { normalizeRefreshAffectedFiles, validateRefreshBoundaryPlan } from "./refresh-boundary.validators";

export function createRefreshBoundaryPlan(input: RefreshBoundaryPlanInput): RefreshBoundaryPlan {
  const errors: string[] = [];
  const affectedFiles = normalizeRefreshAffectedFiles(input.affectedFiles, errors);
  const blockedReason = input.blockedReason ?? createRefreshBoundaryBlockedReason(affectedFiles.length, errors);
  const status = input.status ?? (blockedReason ? REFRESH_BOUNDARY_BLOCKED_STATUS : REFRESH_BOUNDARY_PLANNED_STATUS);

  const plan: RefreshBoundaryPlan = {
    refreshPlanId: input.refreshPlanId.trim(),
    status,
    affectedFiles,
    invalidates: input.invalidates ?? DEFAULT_SOURCE_PATCH_REFRESH_INVALIDATIONS,
    reloadPreview: input.reloadPreview ?? true,
    clearSelection: input.clearSelection ?? true,
    recomputeSnapshot: input.recomputeSnapshot ?? true,
    recomputeGraph: input.recomputeGraph ?? true,
    reason: input.reason.trim(),
    blockedReason,
    safetyNotes: [REFRESH_BOUNDARY_PREVIEW_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateRefreshBoundaryPlan(plan);
  return validation.normalizedPlan ?? plan;
}

function createRefreshBoundaryBlockedReason(affectedFileCount: number, pathErrors: readonly string[]): string | undefined {
  if (pathErrors.length > 0) return pathErrors.join(" ");
  if (affectedFileCount === 0) return "Refresh boundary planning requires at least one affected file.";
  return undefined;
}
