import {
  AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS,
  AUTHORED_SELECTOR_UNSUPPORTED_STATUS,
  AUTHORED_STYLE_MATCHING_BLOCKED_STATUS,
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
import type {
  AuthoredSelectorMatchPreview,
  AuthoredStyleRuleMatchCandidatePreview,
  AuthoredStyleSnapshotNodePreview,
  SelectedNodeAuthoredStyleMatchesPreview
} from "./style-authored-matching.types";

export function validateStyleSourceReferencePreview(preview: StyleSourceReferencePreview): StyleEngineValidationResult<StyleSourceReferencePreview> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!preview.sourceId.trim()) errors.push("StyleSourceReferencePreview requires a sourceId.");
  if (!Number.isSafeInteger(preview.loadOrder) || preview.loadOrder < 0) errors.push("StyleSourceReferencePreview.loadOrder must be a safe non-negative integer.");
  if (preview.canWriteSource !== false) errors.push("StyleSourceReferencePreview.canWriteSource must remain false in Phase 8A.");
  if (preview.status === STYLE_SOURCE_BLOCKED_STATUS && !preview.blockedReason?.trim()) warnings.push("Blocked StyleSourceReferencePreview should include a blockedReason.");
  return result(errors, warnings, {
    ...preview,
    sourceId: preview.sourceId.trim(),
    relativePath: normalizeOptionalPath(preview.relativePath),
    ownerHtmlRelativePath: normalizeOptionalPath(preview.ownerHtmlRelativePath),
    media: preview.media?.trim() || undefined,
    loadOrder: Math.max(0, Math.trunc(preview.loadOrder)),
    canWriteSource: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateStyleSourceInventoryPreview(preview: StyleSourceInventoryPreview): StyleEngineValidationResult<StyleSourceInventoryPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!preview.inventoryId.trim()) errors.push("StyleSourceInventoryPreview requires an inventoryId.");
  if (!preview.targetRelativePath.trim() && preview.status !== STYLE_INVENTORY_BLOCKED_STATUS) errors.push("StyleSourceInventoryPreview requires a targetRelativePath unless it is blocked.");
  if (preview.canEdit !== false) errors.push("StyleSourceInventoryPreview.canEdit must remain false in Phase 8A.");
  if (preview.canApply !== false) errors.push("StyleSourceInventoryPreview.canApply must remain false in Phase 8A.");
  if (preview.sources.some((source) => source.canWriteSource !== false)) errors.push("StyleSourceInventoryPreview cannot contain write-capable style source references.");
  const linkedStylesheetCount = countSources(preview, "linked-css") + countSources(preview, "linked-scss");
  return result(errors, warnings, {
    ...preview,
    inventoryId: preview.inventoryId.trim(),
    targetRelativePath: normalizePath(preview.targetRelativePath),
    sources: preview.sources.map((source) => validateStyleSourceReferencePreview(source).normalizedPreview ?? source),
    inlineStyleBlockCount: normalizeCount(preview.inlineStyleBlockCount, "inlineStyleBlockCount", errors),
    inlineStyleAttributeCount: normalizeCount(preview.inlineStyleAttributeCount, "inlineStyleAttributeCount", errors),
    linkedStylesheetCount: Math.max(0, linkedStylesheetCount),
    unsupportedSourceCount: normalizeCount(preview.unsupportedSourceCount, "unsupportedSourceCount", errors),
    missingSourceCount: normalizeCount(preview.missingSourceCount, "missingSourceCount", errors),
    generatedAtMarker: preview.generatedAtMarker?.trim() || undefined,
    canEdit: false,
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateStyleSelectorPreview(preview: StyleSelectorPreview): StyleEngineValidationResult<StyleSelectorPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!preview.selectorId.trim()) errors.push("StyleSelectorPreview requires selectorId.");
  if (!preview.sourceId.trim()) errors.push("StyleSelectorPreview requires sourceId.");
  if (!preview.selectorText.trim() && preview.matchStatus !== STYLE_SELECTOR_BLOCKED_STATUS) errors.push("StyleSelectorPreview requires selectorText unless it is blocked.");
  if (preview.canEvaluateAgainstIframe !== false) errors.push("StyleSelectorPreview.canEvaluateAgainstIframe must remain false in Phase 8A.");
  if (preview.matchStatus === STYLE_SELECTOR_BLOCKED_STATUS && preview.canEvaluateAgainstDomSnapshot) warnings.push("Blocked selectors should not be marked evaluable.");
  return result(errors, warnings, {
    ...preview,
    selectorId: preview.selectorId.trim(),
    sourceId: preview.sourceId.trim(),
    selectorText: preview.selectorText.trim(),
    canEvaluateAgainstIframe: false,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateStyleDeclarationPreview(preview: StyleDeclarationPreview): StyleEngineValidationResult<StyleDeclarationPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!preview.declarationId.trim()) errors.push("StyleDeclarationPreview requires declarationId.");
  if (!preview.propertyName.trim() && preview.status !== STYLE_DECLARATION_BLOCKED_STATUS) errors.push("StyleDeclarationPreview requires propertyName unless blocked.");
  if (!preview.propertyValue.trim() && preview.status !== STYLE_DECLARATION_BLOCKED_STATUS) warnings.push("StyleDeclarationPreview has an empty propertyValue.");
  if (preview.canEdit !== false) errors.push("StyleDeclarationPreview.canEdit must remain false in Phase 8A.");
  if (preview.canApply !== false) errors.push("StyleDeclarationPreview.canApply must remain false in Phase 8A.");
  return result(errors, warnings, {
    ...preview,
    declarationId: preview.declarationId.trim(),
    propertyName: preview.propertyName.trim(),
    propertyValue: preview.propertyValue.trim(),
    canEdit: false,
    canApply: false,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateStyleRulePreview(preview: StyleRulePreview): StyleEngineValidationResult<StyleRulePreview> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!preview.ruleId.trim()) errors.push("StyleRulePreview requires ruleId.");
  if (!preview.sourceId.trim()) errors.push("StyleRulePreview requires sourceId.");
  if (preview.canEdit !== false) errors.push("StyleRulePreview.canEdit must remain false in Phase 8A.");
  if (preview.canApply !== false) errors.push("StyleRulePreview.canApply must remain false in Phase 8A.");
  if (preview.status === STYLE_RULE_BLOCKED_STATUS && !preview.blockedReason?.trim()) warnings.push("Blocked StyleRulePreview should include blockedReason.");
  if (preview.sourceRange) validateSourceRange(preview.sourceRange, errors);
  return result(errors, warnings, {
    ...preview,
    ruleId: preview.ruleId.trim(),
    sourceId: preview.sourceId.trim(),
    selectorPreviews: preview.selectorPreviews.map((selector) => validateStyleSelectorPreview(selector).normalizedPreview ?? selector),
    declarationPreviews: preview.declarationPreviews.map((declaration) => validateStyleDeclarationPreview(declaration).normalizedPreview ?? declaration),
    canEdit: false,
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateSelectedNodeStyleReadinessPreview(preview: SelectedNodeStyleReadinessPreview): StyleEngineValidationResult<SelectedNodeStyleReadinessPreview> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!preview.readinessId.trim()) errors.push("SelectedNodeStyleReadinessPreview requires readinessId.");
  if (!preview.selectedNodePath.trim() && preview.status !== SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS) errors.push("SelectedNodeStyleReadinessPreview requires selectedNodePath unless blocked.");
  if (!preview.targetRelativePath.trim() && preview.status !== SELECTED_NODE_STYLE_READINESS_BLOCKED_STATUS) errors.push("SelectedNodeStyleReadinessPreview requires targetRelativePath unless blocked.");
  if (preview.canInspectComputedStyles !== false) errors.push("SelectedNodeStyleReadinessPreview.canInspectComputedStyles must remain false.");
  if (preview.canEditStyles !== false) errors.push("SelectedNodeStyleReadinessPreview.canEditStyles must remain false.");
  if (preview.canApply !== false) errors.push("SelectedNodeStyleReadinessPreview.canApply must remain false.");
  return result(errors, warnings, {
    ...preview,
    readinessId: preview.readinessId.trim(),
    selectedNodePath: normalizePath(preview.selectedNodePath),
    targetRelativePath: normalizePath(preview.targetRelativePath),
    inventoryPreview: validateStyleSourceInventoryPreview(preview.inventoryPreview).normalizedPreview ?? preview.inventoryPreview,
    canInspectComputedStyles: false,
    canEditStyles: false,
    canApply: false,
    missingRequirements: normalizeStyleEngineStringList(preview.missingRequirements, "missingRequirements", errors),
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateAuthoredStyleSnapshotNodePreview(preview: AuthoredStyleSnapshotNodePreview): StyleEngineValidationResult<AuthoredStyleSnapshotNodePreview> {
  const errors: string[] = [];
  if (!preview.snapshotPath.trim()) errors.push("AuthoredStyleSnapshotNodePreview requires snapshotPath.");
  if (preview.canReadFromIframe !== false) errors.push("AuthoredStyleSnapshotNodePreview.canReadFromIframe must remain false in Phase 8C.");
  if (preview.safetyNotes.length === 0) errors.push("AuthoredStyleSnapshotNodePreview.safetyNotes must not be empty.");
  return result(errors, [], {
    ...preview,
    snapshotPath: normalizePath(preview.snapshotPath),
    tagName: preview.tagName?.trim().toLowerCase() || null,
    idAttribute: preview.idAttribute?.trim() || null,
    classList: normalizeStyleEngineStringList(preview.classList, "classList", errors),
    attributes: preview.attributes.map((attribute) => ({ name: attribute.name.trim().toLowerCase(), value: attribute.value === null ? null : attribute.value.trim() })).filter((attribute) => attribute.name).sort((left, right) => left.name.localeCompare(right.name)),
    canReadFromIframe: false,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateAuthoredSelectorMatchPreview(preview: AuthoredSelectorMatchPreview): StyleEngineValidationResult<AuthoredSelectorMatchPreview> {
  const errors: string[] = [];
  if (!preview.selectorMatchId.trim()) errors.push("AuthoredSelectorMatchPreview requires selectorMatchId.");
  if (!preview.selectorId.trim()) errors.push("AuthoredSelectorMatchPreview requires selectorId.");
  if (!preview.sourceId.trim()) errors.push("AuthoredSelectorMatchPreview requires sourceId.");
  if (!preview.selectorText.trim() && preview.status !== "blocked") errors.push("AuthoredSelectorMatchPreview requires selectorText unless it is blocked.");
  if (preview.canEvaluateAgainstIframe !== false) errors.push("AuthoredSelectorMatchPreview.canEvaluateAgainstIframe must remain false.");
  if (preview.canInspectComputedStyles !== false) errors.push("AuthoredSelectorMatchPreview.canInspectComputedStyles must remain false.");
  if (preview.canEdit !== false) errors.push("AuthoredSelectorMatchPreview.canEdit must remain false.");
  if (preview.canApply !== false) errors.push("AuthoredSelectorMatchPreview.canApply must remain false.");
  if (preview.matched !== (preview.status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS)) errors.push("AuthoredSelectorMatchPreview.matched may be true only for matched-from-snapshot status.");
  if (preview.status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS && preview.evidence.length === 0) errors.push("matched-from-snapshot selector matches require evidence.");
  if (preview.status === AUTHORED_SELECTOR_UNSUPPORTED_STATUS && !preview.unsupportedReason?.trim()) errors.push("unsupported-selector matches require unsupportedReason.");
  if (preview.safetyNotes.length === 0) errors.push("AuthoredSelectorMatchPreview.safetyNotes must not be empty.");
  return result(errors, [], {
    ...preview,
    selectorMatchId: preview.selectorMatchId.trim(),
    selectorId: preview.selectorId.trim(),
    sourceId: preview.sourceId.trim(),
    selectorText: preview.selectorText.trim(),
    matched: preview.status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS,
    unsupportedReason: preview.unsupportedReason?.trim() || undefined,
    evidence: normalizeStyleEngineStringList(preview.evidence, "evidence", errors),
    canEvaluateAgainstIframe: false,
    canInspectComputedStyles: false,
    canEdit: false,
    canApply: false,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateAuthoredStyleRuleMatchCandidatePreview(preview: AuthoredStyleRuleMatchCandidatePreview): StyleEngineValidationResult<AuthoredStyleRuleMatchCandidatePreview> {
  const errors: string[] = [];
  if (!preview.candidateId.trim()) errors.push("AuthoredStyleRuleMatchCandidatePreview requires candidateId.");
  if (!preview.ruleId.trim()) errors.push("AuthoredStyleRuleMatchCandidatePreview requires ruleId.");
  if (!preview.sourceId.trim()) errors.push("AuthoredStyleRuleMatchCandidatePreview requires sourceId.");
  if (preview.canInspectComputedStyles !== false) errors.push("AuthoredStyleRuleMatchCandidatePreview.canInspectComputedStyles must remain false.");
  if (preview.canEdit !== false) errors.push("AuthoredStyleRuleMatchCandidatePreview.canEdit must remain false.");
  if (preview.canApply !== false) errors.push("AuthoredStyleRuleMatchCandidatePreview.canApply must remain false.");
  if (preview.matchedSelectorCount !== preview.selectorMatches.filter((selector) => selector.status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS).length) errors.push("matchedSelectorCount must equal matched selector matches.");
  if (preview.unsupportedSelectorCount !== preview.selectorMatches.filter((selector) => selector.status === AUTHORED_SELECTOR_UNSUPPORTED_STATUS).length) errors.push("unsupportedSelectorCount must equal unsupported selector matches.");
  if (preview.notMatchedSelectorCount < 0) errors.push("notMatchedSelectorCount must be non-negative.");
  if (preview.status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS && preview.matchedSelectorCount === 0) errors.push("matched-from-snapshot rule candidates require at least one matched selector.");
  if (preview.status === AUTHORED_SELECTOR_UNSUPPORTED_STATUS && preview.unsupportedSelectorCount === 0) errors.push("unsupported-selector rule candidates require at least one unsupported selector.");
  if (preview.safetyNotes.length === 0) errors.push("AuthoredStyleRuleMatchCandidatePreview.safetyNotes must not be empty.");
  return result(errors, [], {
    ...preview,
    candidateId: preview.candidateId.trim(),
    ruleId: preview.ruleId.trim(),
    sourceId: preview.sourceId.trim(),
    selectorMatches: preview.selectorMatches.map((selector) => validateAuthoredSelectorMatchPreview(selector).normalizedPreview ?? selector),
    declarationPreviews: preview.declarationPreviews.map((declaration) => validateStyleDeclarationPreview(declaration).normalizedPreview ?? declaration),
    canInspectComputedStyles: false,
    canEdit: false,
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function validateSelectedNodeAuthoredStyleMatchesPreview(preview: SelectedNodeAuthoredStyleMatchesPreview): StyleEngineValidationResult<SelectedNodeAuthoredStyleMatchesPreview> {
  const errors: string[] = [];
  if (!preview.matchingId.trim()) errors.push("SelectedNodeAuthoredStyleMatchesPreview requires matchingId.");
  if (preview.status !== AUTHORED_STYLE_MATCHING_BLOCKED_STATUS && !preview.selectedNodePath.trim()) errors.push("SelectedNodeAuthoredStyleMatchesPreview requires selectedNodePath unless blocked.");
  if (preview.status !== AUTHORED_STYLE_MATCHING_BLOCKED_STATUS && !preview.targetRelativePath.trim()) errors.push("SelectedNodeAuthoredStyleMatchesPreview requires targetRelativePath unless blocked.");
  if (preview.snapshotNodePreview && !preview.snapshotNodePreview.snapshotPath.trim()) errors.push("snapshotNodePreview requires snapshotPath.");
  if (preview.canInspectComputedStyles !== false) errors.push("SelectedNodeAuthoredStyleMatchesPreview.canInspectComputedStyles must remain false.");
  if (preview.canEditStyles !== false) errors.push("SelectedNodeAuthoredStyleMatchesPreview.canEditStyles must remain false.");
  if (preview.canApply !== false) errors.push("SelectedNodeAuthoredStyleMatchesPreview.canApply must remain false.");
  if (preview.candidates.some((candidate) => candidate.canApply !== false || candidate.canEdit !== false || candidate.canInspectComputedStyles !== false)) errors.push("SelectedNodeAuthoredStyleMatchesPreview cannot contain Apply-capable, edit-capable, or computed-style-capable candidates.");
  if (preview.matchedCandidateCount + preview.unsupportedCandidateCount + preview.notMatchedCandidateCount > preview.totalCandidateCount) errors.push("Authored style candidate counts cannot exceed totalCandidateCount.");
  if (preview.totalCandidateCount !== preview.candidates.length) errors.push("totalCandidateCount must equal candidates.length.");
  if (preview.matchedCandidateCount !== preview.candidates.filter((candidate) => candidate.status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS).length) errors.push("matchedCandidateCount must equal matched candidates.");
  if (preview.unsupportedCandidateCount !== preview.candidates.filter((candidate) => candidate.status === AUTHORED_SELECTOR_UNSUPPORTED_STATUS).length) errors.push("unsupportedCandidateCount must equal unsupported candidates.");
  if (preview.status === AUTHORED_STYLE_MATCHING_BLOCKED_STATUS && !preview.blockedReason?.trim()) errors.push("blocked authored style matches require blockedReason.");
  if (preview.safetyNotes.length === 0) errors.push("SelectedNodeAuthoredStyleMatchesPreview.safetyNotes must not be empty.");
  return result(errors, [], {
    ...preview,
    matchingId: preview.matchingId.trim(),
    selectedNodePath: normalizePath(preview.selectedNodePath),
    targetRelativePath: normalizePath(preview.targetRelativePath),
    snapshotNodePreview: preview.snapshotNodePreview ? validateAuthoredStyleSnapshotNodePreview(preview.snapshotNodePreview).normalizedPreview ?? preview.snapshotNodePreview : null,
    candidates: preview.candidates.map((candidate) => validateAuthoredStyleRuleMatchCandidatePreview(candidate).normalizedPreview ?? candidate),
    canInspectComputedStyles: false,
    canEditStyles: false,
    canApply: false,
    blockedReason: preview.blockedReason?.trim() || undefined,
    safetyNotes: normalizeStyleEngineStringList(preview.safetyNotes, "safetyNotes", errors)
  });
}

export function normalizeStyleEngineStringList(values: readonly string[] | undefined, label: string, errors: string[] = []): readonly string[] {
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

function result<TPreview>(errors: readonly string[], warnings: readonly string[], normalizedPreview: TPreview): StyleEngineValidationResult<TPreview> {
  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

function countSources(preview: StyleSourceInventoryPreview, kind: string): number {
  return preview.sources.filter((source) => source.sourceKind === kind).length;
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
  if (!Number.isSafeInteger(range.startOffset) || range.startOffset < 0) errors.push("StyleSourceRangePreview.startOffset must be a safe non-negative integer.");
  if (!Number.isSafeInteger(range.endOffset) || range.endOffset < range.startOffset) errors.push("StyleSourceRangePreview.endOffset must be a safe integer greater than or equal to startOffset.");
}
