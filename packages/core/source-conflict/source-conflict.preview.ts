import {
  SOURCE_CONFLICT_CLEAN_PREVIEW_STATUS,
  SOURCE_CONFLICT_NOT_CHECKED_STATUS,
  SOURCE_CONFLICT_PREVIEW_SAFETY_NOTE,
  SOURCE_CONFLICT_RECHECK_REQUIRED_NOTE,
  SOURCE_CONFLICT_RISK_STATUS
} from "./source-conflict.constants";
import type { SourceConflictPreview, SourceConflictPreviewInput } from "./source-conflict.types";
import { normalizeSourceConflictFileList, validateSourceConflictPreview } from "./source-conflict.validators";

export function createSourceConflictPreview(input: SourceConflictPreviewInput): SourceConflictPreview {
  const errors: string[] = [];
  const affectedFiles = normalizeSourceConflictFileList(input.affectedFiles, errors);
  const expectedSourceVersion = normalizeVersion(input.expectedSourceVersion);
  const observedSourceVersion = normalizeVersion(input.observedSourceVersion);
  const requiresFreshSource = input.requiresFreshSource ?? affectedFiles.length > 0;
  const blockedReason = input.blockedReason ?? (errors.length > 0 ? errors.join(" ") : undefined);
  const status = input.status ?? deriveSourceConflictStatus(expectedSourceVersion, observedSourceVersion, blockedReason);

  const preview: SourceConflictPreview = {
    conflictPreviewId: input.conflictPreviewId.trim(),
    status,
    affectedFiles,
    expectedSourceVersion,
    observedSourceVersion,
    requiresFreshSource,
    canApplyWithoutRecheck: false,
    blockedReason,
    safetyNotes: [SOURCE_CONFLICT_PREVIEW_SAFETY_NOTE, SOURCE_CONFLICT_RECHECK_REQUIRED_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateSourceConflictPreview(preview);
  return validation.normalizedPreview ?? preview;
}

function deriveSourceConflictStatus(expectedSourceVersion: string | undefined, observedSourceVersion: string | undefined, blockedReason?: string): SourceConflictPreview["status"] {
  if (blockedReason) return "blocked";
  if (!expectedSourceVersion || !observedSourceVersion) return SOURCE_CONFLICT_NOT_CHECKED_STATUS;
  if (expectedSourceVersion === observedSourceVersion) return SOURCE_CONFLICT_CLEAN_PREVIEW_STATUS;
  return SOURCE_CONFLICT_RISK_STATUS;
}

function normalizeVersion(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
