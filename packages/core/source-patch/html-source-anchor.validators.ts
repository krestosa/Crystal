import { hasUnsafeProjectRelativePath } from "./source-patch.validators";
import type { HtmlSourceInsertionAnchor, HtmlSourceInsertionAnchorValidationResult } from "./html-source-anchor.types";

export function validateHtmlSourceInsertionAnchor(anchor: HtmlSourceInsertionAnchor): HtmlSourceInsertionAnchorValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const targetFilePath = anchor.targetFilePath.trim();
  const targetSnapshotPath = anchor.targetSnapshotPath.trim();
  const targetTagName = anchor.targetTagName.trim().toLowerCase();
  const reason = anchor.reason.trim();

  if (!targetFilePath) errors.push("targetFilePath is required.");
  if (targetFilePath && hasUnsafeProjectRelativePath(targetFilePath)) errors.push("targetFilePath must be a safe project-relative path.");
  if (!targetSnapshotPath) errors.push("targetSnapshotPath is required.");
  if (!targetTagName) errors.push("targetTagName is required.");
  if (!reason) errors.push("reason is required.");

  if (anchor.status === "ready" && !anchor.sourceLocation) errors.push("ready anchors require sourceLocation.");
  if (anchor.status === "ready" && anchor.confidence === "unavailable") errors.push("ready anchors require exact or estimated confidence.");
  if (anchor.status !== "ready" && anchor.confidence !== "unavailable") warnings.push("blocked anchors should use unavailable confidence in Phase 6B.");

  if (anchor.sourceLocation) {
    if (!Number.isFinite(anchor.sourceLocation.offset) || anchor.sourceLocation.offset < 0) errors.push("sourceLocation.offset must be finite and non-negative.");
    if (!Number.isFinite(anchor.sourceLocation.line) || anchor.sourceLocation.line < 1) errors.push("sourceLocation.line must be finite and one-based.");
    if (!Number.isFinite(anchor.sourceLocation.column) || anchor.sourceLocation.column < 1) errors.push("sourceLocation.column must be finite and one-based.");
  }

  const normalizedAnchor: HtmlSourceInsertionAnchor | undefined = errors.length === 0
    ? {
        ...anchor,
        targetFilePath,
        targetSnapshotPath,
        targetTagName,
        reason
      }
    : undefined;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedAnchor
  };
}
