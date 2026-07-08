import { hasUnsafeProjectRelativePath } from "../source-patch";
import {
  DEFAULT_SOURCE_PATCH_REFRESH_INVALIDATIONS,
  REFRESH_BOUNDARY_BLOCKED_STATUS,
  REFRESH_BOUNDARY_PLANNED_STATUS,
  REFRESH_BOUNDARY_UNSUPPORTED_STATUS
} from "./refresh-boundary.constants";
import type {
  RefreshBoundaryPlan,
  RefreshBoundaryPlanStatus,
  RefreshBoundaryValidationResult,
  RefreshInvalidationTarget
} from "./refresh-boundary.types";

const ALLOWED_REFRESH_STATUSES: readonly RefreshBoundaryPlanStatus[] = [
  REFRESH_BOUNDARY_PLANNED_STATUS,
  REFRESH_BOUNDARY_BLOCKED_STATUS,
  REFRESH_BOUNDARY_UNSUPPORTED_STATUS
];

const ALLOWED_INVALIDATION_TARGETS: readonly RefreshInvalidationTarget[] = DEFAULT_SOURCE_PATCH_REFRESH_INVALIDATIONS;

export function validateRefreshBoundaryPlan(plan: RefreshBoundaryPlan): RefreshBoundaryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const refreshPlanId = plan.refreshPlanId.trim();
  const reason = plan.reason.trim();
  const affectedFiles = normalizeRefreshAffectedFiles(plan.affectedFiles, errors);
  const invalidates = normalizeInvalidationTargets(plan.invalidates, errors);
  const blockedReason = plan.blockedReason?.trim();

  if (!refreshPlanId) errors.push("refreshPlanId is required.");
  if (!reason) errors.push("reason is required.");
  if (!ALLOWED_REFRESH_STATUSES.includes(plan.status)) errors.push(`Unsupported refresh boundary status: ${plan.status}.`);

  if (plan.status === REFRESH_BOUNDARY_PLANNED_STATUS && affectedFiles.length === 0) {
    errors.push("planned refresh boundary requires at least one affected file.");
  }

  if (plan.status === REFRESH_BOUNDARY_BLOCKED_STATUS && !blockedReason) {
    errors.push("blocked refresh boundary requires blockedReason.");
  }

  if (invalidates.length === 0) warnings.push("Refresh boundary plan should invalidate at least one derived state target.");

  const normalizedPlan: RefreshBoundaryPlan | undefined = errors.length === 0
    ? {
        ...plan,
        refreshPlanId,
        affectedFiles,
        invalidates,
        reason,
        blockedReason,
        safetyNotes: plan.safetyNotes.map((note) => note.trim()).filter(Boolean)
      }
    : undefined;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedPlan
  };
}

export function normalizeRefreshAffectedFiles(files: readonly string[], errors: string[] = []): readonly string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const file of files) {
    const trimmed = file.trim();
    if (!trimmed) continue;
    if (hasUnsafeProjectRelativePath(trimmed)) {
      errors.push(`affectedFiles entry must be a safe project-relative path: ${trimmed}`);
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

export function normalizeInvalidationTargets(targets: readonly RefreshInvalidationTarget[], errors: string[] = []): readonly RefreshInvalidationTarget[] {
  const seen = new Set<RefreshInvalidationTarget>();
  const normalized: RefreshInvalidationTarget[] = [];

  for (const target of targets) {
    if (!ALLOWED_INVALIDATION_TARGETS.includes(target)) {
      errors.push(`Unsupported refresh invalidation target: ${target}.`);
      continue;
    }
    if (!seen.has(target)) {
      seen.add(target);
      normalized.push(target);
    }
  }

  return normalized;
}
