import type { ProjectPreviewSelectedNode, ProjectPreviewSelectedNodeAttribute, ProjectPreviewSelectedNodeValidationResult, ProjectPreviewSelectionIssue, ProjectPreviewSelectionIssueCode } from "./project-preview-selection.types";

export const projectPreviewSelectionLimits = {
  maxSnapshotPathLength: 512,
  maxTagNameLength: 64,
  maxDepth: 128,
  maxSiblingIndex: 100000,
  maxAttributes: 8,
  maxAttributeNameLength: 40,
  maxAttributeValueLength: 120,
  maxTextPreviewLength: 160,
  maxSelectorPreviewLength: 180
} as const;

export function validateProjectPreviewSelectedNodePayload(payload: unknown): ProjectPreviewSelectedNodeValidationResult {
  if (!isRecord(payload)) return invalid("invalid-selected-node-payload", "Selected node payload must be an object.");

  const snapshotPath = sanitizeString(payload.snapshotPath, projectPreviewSelectionLimits.maxSnapshotPathLength);
  if (!snapshotPath || !isValidSnapshotPath(snapshotPath)) return invalid("invalid-snapshot-path", "Selected node snapshotPath is invalid.");

  const tagName = sanitizeString(payload.tagName, projectPreviewSelectionLimits.maxTagNameLength).toLowerCase();
  if (!isValidTagName(tagName)) return invalid("invalid-tag-name", "Selected node tagName is invalid.");

  if (!isSafeInteger(payload.siblingIndex, projectPreviewSelectionLimits.maxSiblingIndex)) return invalid("invalid-sibling-index", "Selected node siblingIndex is invalid.");
  if (!isSafeInteger(payload.depth, projectPreviewSelectionLimits.maxDepth)) return invalid("invalid-depth", "Selected node depth is invalid.");

  const snapshotDepth = snapshotPath.split("/").length - 1;
  if (payload.depth !== snapshotDepth) return invalid("invalid-depth", "Selected node depth does not match snapshotPath.");

  const attributesPreview = sanitizeAttributesPreview(payload.attributesPreview);
  if (!attributesPreview) return invalid("invalid-attributes-preview", "Selected node attributesPreview is invalid.");

  if (typeof payload.textPreview !== "string") return invalid("invalid-text-preview", "Selected node textPreview is invalid.");
  if (typeof payload.selectorPreview !== "string") return invalid("invalid-selector-preview", "Selected node selectorPreview is invalid.");

  return {
    ok: true,
    selectedNode: {
      snapshotPath,
      tagName,
      siblingIndex: payload.siblingIndex,
      depth: payload.depth,
      attributesPreview,
      textPreview: sanitizeString(payload.textPreview, projectPreviewSelectionLimits.maxTextPreviewLength),
      selectorPreview: sanitizeString(payload.selectorPreview, projectPreviewSelectionLimits.maxSelectorPreviewLength)
    },
    issue: null
  };
}

function sanitizeAttributesPreview(value: unknown): readonly ProjectPreviewSelectedNodeAttribute[] | null {
  if (!Array.isArray(value)) return null;
  const attributes = value.slice(0, projectPreviewSelectionLimits.maxAttributes);
  const result: ProjectPreviewSelectedNodeAttribute[] = [];

  for (const attribute of attributes) {
    if (!isRecord(attribute)) return null;
    const name = sanitizeString(attribute.name, projectPreviewSelectionLimits.maxAttributeNameLength);
    if (!isValidAttributeName(name)) return null;
    const rawValue = attribute.value;
    if (rawValue !== null && typeof rawValue !== "string") return null;
    result.push({ name, value: rawValue === null ? null : sanitizeString(rawValue, projectPreviewSelectionLimits.maxAttributeValueLength) });
  }

  return result;
}

function sanitizeString(value: unknown, maxLength: number): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeInteger(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
}

function isValidSnapshotPath(value: string): boolean {
  return value.length <= projectPreviewSelectionLimits.maxSnapshotPathLength && /^0(?:\/(?:0|[1-9]\d*))*$/.test(value);
}

function isValidTagName(value: string): boolean {
  return value.length > 0 && value.length <= projectPreviewSelectionLimits.maxTagNameLength && /^[a-z][a-z0-9-]*$/.test(value);
}

function isValidAttributeName(value: string): boolean {
  return value.length > 0 && value.length <= projectPreviewSelectionLimits.maxAttributeNameLength && !/[\s"'<>/=]/.test(value);
}

function invalid(code: ProjectPreviewSelectionIssueCode, message: string): ProjectPreviewSelectedNodeValidationResult {
  return { ok: false, selectedNode: null, issue: createProjectPreviewSelectionIssue(code, message, code === "unknown" ? "warning" : "error") };
}

export function createProjectPreviewSelectionIssue(code: ProjectPreviewSelectionIssueCode, message: string, severity: ProjectPreviewSelectionIssue["severity"] = "warning"): ProjectPreviewSelectionIssue {
  return { code, message, severity, timestamp: Date.now() };
}
