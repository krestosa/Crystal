import {
  SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS,
  STYLE_DECLARATION_BLOCKED_STATUS,
  STYLE_INVENTORY_BLOCKED_STATUS,
  STYLE_RULE_BLOCKED_STATUS,
  STYLE_SELECTOR_BLOCKED_STATUS,
  STYLE_SOURCE_BLOCKED_STATUS
} from "./style-engine.constants";
import type {
  SelectedNodeStyleReadinessPreview,
  StyleDeclarationPreview,
  StyleEngineValidationResult,
  StyleRulePreview,
  StyleSelectorPreview,
  StyleSourceInventoryPreview,
  StyleSourceRangePreview,
  StyleSourceReferencePreview
} from "./style-engine.types";

export function validateStyleSourceReferencePreview(
  preview: StyleSourceReferencePreview
): StyleEngineValidationResult<StyleSourceReferencePreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.sourceId.trim()) errors.push("StyleSourceReferencePreview requires a sourceId.");
  if (!Number.isSafeInteger(preview.loadOrder) || preview.loadOrder < 0) {
    errors.push("StyleSourceReferencePreview.loadOrder must be a safe non-negative integer.");
  }
  if (preview.canWriteSource !== false) errors.push("StyleSourceReferencePreview.canWriteSource must remain false in Phase 8A.");
  if (preview.status === STYLE_SOURCE_BLOCKED_STATUS && !preview.blockedReason?.trim()) {
    warnings.push("Blocked StyleSourceReferencePreview should include a blockedReason.");
  }
  if (preview.sourceKind === "inline-style-attribute" && preview.canReadSource) {
    warnings.push("Inline attribute style references should normally remain unreadable until node-level source ownership exists.");
  }

  const normalizedPreview: StyleSourceReferencePreview = {
    ...preview,
    sourceId: preview.sourceId.trim(),
    relativePath: normalizeOptionalPath(preview.relativePath),
    ownerHtmlRelativePath: normalizeOptionalPath(preview.ownerHtmlRelativePath),
    media: preview.media?.trim() || undefined,
    loadOrder: Math.max(0, Math.trunc(preview.loadOrder)),
    canWriteSource: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function validateStyleSourceInventoryPreview(
  preview: StyleSourceInventoryPreview
): StyleEngineValidationResult<StyleSourceInventoryPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.inventoryId.trim()) errors.push("StyleSourceInventoryPreview requires an inventoryId.");
  if (!preview.targetRelativePath.trim() && preview.status !== STYLE_INVENTORY_BLOCKED_STATUS) {
    errors.push("StyleSourceInventoryPreview requires a targetRelativePath unless it is blocked.");
  }
  if (preview.canEdit !== false) errors.push("StyleSourceInventoryPreview.canEdit must remain false in Phase 8A.");
  if (preview.canApply !== false) errors.push("StyleSourceInventoryPreview.canApply must remain false in Phase 8A.");
  if (preview.status === STYLE_INVENTORY_BLOCKED_STATUS && !preview.blockedReason?.trim()) {
    warnings.push("Blocked StyleSourceInventoryPreview should include a blockedReason.");
  }
  if (preview.sources.some((source) => source.canWriteSource !== false)) {
    errors.push("StyleSourceInventoryPreview cannot contain write-capable style source references.");
  }

  const normalizedPreview: StyleSourceInventoryPreview = {
    ...preview,
    inventoryId: preview.inventoryId.trim(),
    targetRelativePath: normalizePath(preview.targetRelativePath),
    sources: preview.sources.map((source) => validateStyleSourceReferencePreview(source).normalizedPreview ?? source),
    inlineStyleBlockCount: normalizeCount(preview.inlineStyleBlockCount, "inlineStyleBlockCount", errors),
    inlineStyleAttributeCount: normalizeCount(preview.inlineStyleAttributeCount, "inlineStyleAttributeCount", errors),
    linkedStylesheetCount: normalizeCount(preview.linkedStylesheetCount, "linkedStylesheetCount", errors),
    unsupportedSourceCount: normalizeCount(preview.unsupportedSourceCount, "unsupportedSourceCount", errors),
    missingSourceCount: normalizeCount(preview.missingSourceCount, "missingSourceCount", errors),
    generatedAtMarker: preview.generatedAtMarker?.trim() || undefined,
    canEdit: false,
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function validateStyleSelectorPreview(preview: StyleSelectorPreview): StyleEngineValidationResult<StyleSelectorPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.selectorId.trim()) errors.push("StyleSelectorPreview requires a selectorId.");
  if (!preview.sourceId.trim()) errors.push("StyleSelectorPreview requires a sourceId.");
  if (!preview.selectorText.trim() && preview.matchStatus !== STYLE_SELECTOR_BLOCKED_STATUS) {
    errors.push("StyleSelectorPreview requires selectorText unless it is blocked.");
  }
  if (preview.canEvaluateAgainstIframe !== false) errors.push("StyleSelectorPreview.canEvaluateAgainstIframe must remain false in Phase 8A.");
  if (preview.matchStatus !== "not-evaluated" && preview.canEvaluateAgainstDomSnapshot) {
    warnings.push("Selector preview evaluation should remain not-evaluated in Phase 8A.");
  }

  const normalizedPreview: StyleSelectorPreview = {
    ...preview,
    selectorId: preview.selectorId.trim(),
    sourceId: preview.sourceId.trim(),
    selectorText: preview.selectorText.trim(),
    canEvaluateAgainstIframe: false,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function validateStyleDeclarationPreview(
  preview: StyleDeclarationPreview
): StyleEngineValidationResult<StyleDeclarationPreview> {
  const errors: string[] = [];

  if (!preview.declarationId.trim()) errors.push("StyleDeclarationPreview requires a declarationId.");
  if (!preview.propertyName.trim() && preview.status !== STYLE_DECLARATION_BLOCKED_STATUS) {
    errors.push("StyleDeclarationPreview requires a propertyName unless it is blocked.");
  }
  if (preview.canEdit !== false) errors.push("StyleDeclarationPreview.canEdit must remain false in Phase 8A.");
  if (preview.canApply !== false) errors.push("StyleDeclarationPreview.canApply must remain false in Phase 8A.");

  const normalizedPreview: StyleDeclarationPreview = {
    ...preview,
    declarationId: preview.declarationId.trim(),
    propertyName: preview.propertyName.trim(),
    propertyValue: preview.propertyValue.trim(),
    canEdit: false,
    canApply: false,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings: [], normalizedPreview };
}

export function validateStyleRulePreview(preview: StyleRulePreview): StyleEngineValidationResult<StyleRulePreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.ruleId.trim()) errors.push("StyleRulePreview requires a ruleId.");
  if (!preview.sourceId.trim()) errors.push("StyleRulePreview requires a sourceId.");
  if (preview.canEdit !== false) errors.push("StyleRulePreview.canEdit must remain false in Phase 8A.");
  if (preview.canApply !== false) errors.push("StyleRulePreview.canApply must remain false in Phase 8A.");
  if (preview.status === STYLE_RULE_BLOCKED_STATUS && !preview.blockedReason?.trim()) {
    warnings.push("Blocked StyleRulePreview should include a blockedReason.");
  }
  if (preview.sourceRange) validateSourceRange(preview.sourceRange, errors);

  const normalizedPreview: StyleRulePreview = {
    ...preview,
    ruleId: preview.ruleId.trim(),
    sourceId: preview.sourceId.trim(),
    selectorPreviews: preview.selectorPreviews.map((selector) => validateStyleSelectorPreview(selector).normalizedPreview ?? selector),
    declarationPreviews: preview.declarationPreviews.map((declaration) => validateStyleDeclarationPreview(declaration).normalizedPreview ?? declaration),
    canEdit: false,
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function validateSelectedNodeStyleReadinessPreview(
  preview: SelectedNodeStyleReadinessPreview
): StyleEngineValidationResult<SelectedNodeStyleReadinessPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!preview.readinessId.trim()) errors.push("SelectedNodeStyleReadinessPreview requires a readinessId.");
  if (!preview.selectedNodePath.trim() && preview.status !== SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS) {
    errors.push("SelectedNodeStyleReadinessPreview requires a selectedNodePath unless it is blocked.");
  }
  if (!preview.targetRelativePath.trim() && preview.status !== SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS) {
    errors.push("SelectedNodeStyleReadinessPreview requires a targetRelativePath unless it is blocked.");
  }
  if (preview.canInspectComputedStyles !== false) {
    errors.push("SelectedNodeStyleReadinessPreview.canInspectComputedStyles must remain false in Phase 8A.");
  }
  if (preview.canEditStyles !== false) errors.push("SelectedNodeStyleReadinessPreview.canEditStyles must remain false in Phase 8A.");
  if (preview.canApply !== false) errors.push("SelectedNodeStyleReadinessPreview.canApply must remain false in Phase 8A.");
  if (preview.inventoryPreview.canApply !== false || preview.inventoryPreview.canEdit !== false) {
    errors.push("SelectedNodeStyleReadinessPreview cannot depend on editable or Apply-capable style inventory.");
  }
  if (preview.status === "inventory-only" && !preview.canInspectAuthoredStyles) {
    warnings.push("Inventory-only readiness should expose authored style inventory inspection.");
  }

  const normalizedPreview: SelectedNodeStyleReadinessPreview = {
    ...preview,
    readinessId: preview.readinessId.trim(),
    selectedNodePath: preview.selectedNodePath.trim(),
    targetRelativePath: normalizePath(preview.targetRelativePath),
    inventoryPreview: validateStyleSourceInventoryPreview(preview.inventoryPreview).normalizedPreview ?? preview.inventoryPreview,
    canInspectComputedStyles: false,
    canEditStyles: false,
    canApply: false,
    missingRequirements: normalizeStyleEngineStringList(preview.missingRequirements, "missingRequirements", errors),
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function normalizeStyleEngineStringList(
  values: readonly string[] | undefined,
  label: string,
  errors: string[] = []
): readonly string[] {
  const normalized = new Set<string>();
  for (const value of values ?? []) {
    const text = value.trim();
    if (!text) {
      errors.push(`${label} cannot contain empty values.`);
      continue;
    }
    normalized.add(text);
  }
  return [...normalized].sort();
}

export function normalizeStyleEnginePathList(values: readonly string[] | undefined, errors: string[] = []): readonly string[] {
  return normalizeStyleEngineStringList(values ?? [], "paths", errors).map(normalizePath);
}

function normalizePath(value: string): string {
  return value.trim().replace(/\\/g, "/");
}

function normalizeOptionalPath(value: string | undefined): string | undefined {
  const normalized = value ? normalizePath(value) : "";
  return normalized || undefined;
}

function normalizeCount(value: number, label: string, errors: string[]): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    errors.push(`${label} must be a safe non-negative integer.`);
    return 0;
  }
  return value;
}

function validateSourceRange(range: StyleSourceRangePreview, errors: string[]): void {
  if (!Number.isSafeInteger(range.startOffset) || range.startOffset < 0) {
    errors.push("StyleSourceRangePreview.startOffset must be a safe non-negative integer.");
  }
  if (!Number.isSafeInteger(range.endOffset) || range.endOffset < range.startOffset) {
    errors.push("StyleSourceRangePreview.endOffset must be a safe integer greater than or equal to startOffset.");
  }
}
