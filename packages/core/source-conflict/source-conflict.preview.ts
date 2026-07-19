import {
  SOURCE_CONFLICT_CLEAN_PREVIEW_STATUS,
  SOURCE_CONFLICT_NOT_CHECKED_STATUS,
  SOURCE_CONFLICT_PREVIEW_SAFETY_NOTE,
  SOURCE_CONFLICT_RECHECK_REQUIRED_NOTE,
  SOURCE_CONFLICT_RISK_STATUS
} from "./source-conflict.constants";
import type {
  SourceConflictPreview,
  SourceConflictPreviewInput,
  SourceConflictRevisionCheckInput
} from "./source-conflict.types";
import { compareSourceVersions } from "./source-version";
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

export function createSourceConflictPreviewFromRevisionCheck(input: SourceConflictRevisionCheckInput): SourceConflictPreview {
  const common = {
    conflictPreviewId: input.conflictPreviewId,
    affectedFiles: input.affectedFiles,
    expectedSourceVersion: input.expectedSourceVersion,
    requiresFreshSource: input.requiresFreshSource ?? true,
    safetyNotes: input.safetyNotes
  };

  if (input.revisionReadResult.status !== "ready") {
    return createSourceConflictPreview({
      ...common,
      status: "blocked",
      blockedReason: describeRevisionReadFailure(input.revisionReadResult.status, input.revisionReadResult.reason)
    });
  }

  const observedSourceVersion = input.revisionReadResult.sourceVersion;
  const comparison = compareSourceVersions(input.expectedSourceVersion, observedSourceVersion);

  if (comparison.status === "match") {
    return createSourceConflictPreview({
      ...common,
      status: "clean-preview",
      expectedSourceVersion: comparison.expected.token,
      observedSourceVersion: comparison.observed.token
    });
  }
  if (comparison.status === "mismatch") {
    return createSourceConflictPreview({
      ...common,
      status: "conflict-risk",
      expectedSourceVersion: comparison.expected.token,
      observedSourceVersion: comparison.observed.token
    });
  }
  if (comparison.status === "unavailable") {
    return createSourceConflictPreview({
      ...common,
      status: "not-checked",
      observedSourceVersion
    });
  }

  return createSourceConflictPreview({
    ...common,
    status: "blocked",
    observedSourceVersion,
    blockedReason: comparison.status === "invalid-expected"
      ? `Expected source revision is invalid (${comparison.reason}).`
      : `Observed source revision is invalid (${comparison.reason}).`
  });
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

function describeRevisionReadFailure(status: string, reason: string): string {
  const labels: Readonly<Record<string, string>> = {
    "invalid-path": "Source revision path validation failed",
    "outside-root": "Source revision target is outside the project root",
    missing: "Source file is missing",
    "not-file": "Source revision target is not a regular file",
    "too-large": "Source file exceeds the revision read limit",
    unreadable: "Source file could not be read"
  };
  return `${labels[status] ?? "Source revision check failed"} (${reason}).`;
}
