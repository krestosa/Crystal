import {
  SOURCE_PATCH_MAX_INSERTED_CHARS,
  SOURCE_PATCH_OPERATION_INSERT_TEXT,
  SOURCE_PATCH_READY_STATUS
} from "./source-patch.constants";
import type { SourcePatchPreview, SourcePatchRange, SourcePatchValidationResult } from "./source-patch.types";

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;

export function validateSourcePatchPreview(preview: SourcePatchPreview): SourcePatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [...preview.warnings];
  const targetFilePath = preview.targetFilePath.trim();
  const patchId = preview.patchId.trim();
  const humanSummary = preview.humanSummary.trim();

  if (!patchId) errors.push("patchId is required.");
  if (!targetFilePath) errors.push("targetFilePath is required.");
  if (hasUnsafeProjectRelativePath(targetFilePath)) errors.push("targetFilePath must be a safe project-relative path.");
  validateRange(preview.range, errors);

  if (preview.operationKind === SOURCE_PATCH_OPERATION_INSERT_TEXT && preview.range.startOffset !== preview.range.endOffset) {
    errors.push("insert-text range must have equal startOffset and endOffset.");
  }

  if (preview.status === SOURCE_PATCH_READY_STATUS && !preview.insertedTextPreview.trim()) {
    errors.push("insertedTextPreview is required for ready previews.");
  }

  if (preview.insertedTextPreview.length > SOURCE_PATCH_MAX_INSERTED_CHARS) {
    warnings.push("insertedTextPreview was truncated to the source patch preview limit.");
  }

  if (preview.status !== SOURCE_PATCH_READY_STATUS && preview.errors.length === 0 && preview.warnings.length === 0 && !humanSummary) {
    errors.push("blocked, invalid, or unsupported previews must include a reason.");
  }

  const normalizedPreview: SourcePatchPreview | undefined = errors.length === 0
    ? {
        ...preview,
        patchId,
        targetFilePath,
        humanSummary
      }
    : undefined;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedPreview
  };
}

export function hasUnsafeProjectRelativePath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").trim();
  if (!normalized) return true;
  if (normalized.startsWith("/") || WINDOWS_ABSOLUTE_PATH_PATTERN.test(path)) return true;
  return normalized.split("/").some((segment) => segment === "..");
}

function validateRange(range: SourcePatchRange, errors: string[]): void {
  if (!Number.isFinite(range.startOffset)) errors.push("range.startOffset must be finite.");
  if (!Number.isFinite(range.endOffset)) errors.push("range.endOffset must be finite.");
  if (Number.isFinite(range.startOffset) && Number.isFinite(range.endOffset) && range.startOffset > range.endOffset) {
    errors.push("range.startOffset must be less than or equal to range.endOffset.");
  }
  if (range.startOffset < 0 || range.endOffset < 0) errors.push("range offsets must be non-negative.");
}
