import { SOURCE_CONFLICT_BLOCKED_STATUS } from "./source-conflict.constants";
import type { SourceConflictPreview, SourceConflictPreviewValidationResult } from "./source-conflict.types";

export function validateSourceConflictPreview(preview: SourceConflictPreview): SourceConflictPreviewValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const affectedFiles = normalizeSourceConflictFileList(preview.affectedFiles, errors);

  if (!preview.conflictPreviewId.trim()) errors.push("SourceConflictPreview requires a conflictPreviewId.");
  if (preview.canApplyWithoutRecheck !== false) errors.push("SourceConflictPreview.canApplyWithoutRecheck must remain false in Phase 6D.");
  if (preview.status === SOURCE_CONFLICT_BLOCKED_STATUS && !preview.blockedReason?.trim()) {
    errors.push("blocked source conflict preview requires a blockedReason.");
  }
  if (preview.status === "clean-preview" && (!preview.expectedSourceVersion || !preview.observedSourceVersion)) {
    errors.push("clean-preview source conflict status requires expected and observed version metadata.");
  }
  if (preview.status === "conflict-risk" && affectedFiles.length === 0) {
    warnings.push("conflict-risk source conflict preview has no affected files.");
  }

  const normalizedPreview: SourceConflictPreview = {
    ...preview,
    conflictPreviewId: preview.conflictPreviewId.trim(),
    affectedFiles,
    expectedSourceVersion: normalizeVersion(preview.expectedSourceVersion),
    observedSourceVersion: normalizeVersion(preview.observedSourceVersion),
    requiresFreshSource: preview.requiresFreshSource,
    canApplyWithoutRecheck: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function normalizeSourceConflictFileList(values: readonly string[] | undefined, errors: string[] = []): readonly string[] {
  return normalizeStringList(values ?? [], "affectedFiles", errors);
}

function normalizeVersion(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeStringList(values: readonly string[], label: string, errors: string[]): readonly string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const text = value.trim();
    if (!text) {
      errors.push(`${label} cannot contain empty values.`);
      continue;
    }
    normalized.add(text.replace(/\\/g, "/"));
  }
  return [...normalized].sort();
}
