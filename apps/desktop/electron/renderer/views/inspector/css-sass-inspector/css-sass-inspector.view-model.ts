import {
  CSS_SASS_INSPECTOR_APPLY_LABEL,
  CSS_SASS_INSPECTOR_BLOCKED_MESSAGE,
  CSS_SASS_INSPECTOR_EMPTY_MESSAGE,
  CSS_SASS_INSPECTOR_SAFETY_NOTES,
  CSS_SASS_INSPECTOR_SURFACE_ID,
  CSS_SASS_INSPECTOR_TITLE
} from "./css-sass-inspector.constants";
import type {
  CSSSassInspectorApplyAffordance,
  CSSSassInspectorAuthoredMatchesSummary,
  CSSSassInspectorAuthoredMatchSection,
  CSSSassInspectorRuleSection,
  CSSSassInspectorSourceSection,
  CSSSassInspectorSourceSummary,
  CSSSassInspectorSurfaceInput,
  CSSSassInspectorSurfaceStatus,
  CSSSassInspectorSurfaceViewModel
} from "./css-sass-inspector.types";
import type {
  AuthoredStyleRuleMatchCandidatePreview,
  SelectedNodeAuthoredStyleMatchesPreview,
  SelectedNodeStyleReadinessPreview,
  StyleRulePreview,
  StyleSourceInventoryPreview,
  StyleSourceReferencePreview
} from "../../../../../../../packages/core/style-engine";

export function createCSSSassInspectorSurfaceViewModel(input: CSSSassInspectorSurfaceInput): CSSSassInspectorSurfaceViewModel {
  const readinessPreview = input.readinessPreview ?? null;
  const inventoryPreview = readinessPreview?.inventoryPreview ?? null;
  const authoredMatchesPreview = input.authoredMatchesPreview ?? null;
  const sourceSummary = createSourceSummary(readinessPreview, inventoryPreview);
  const authoredMatchesSummary = createAuthoredMatchesSummary(authoredMatchesPreview);
  const sourceSections = (inventoryPreview?.sources ?? []).map(createSourceSection);
  const ruleSections = (input.rulePreviews ?? []).map(createRuleSection);
  const authoredMatchSections = (authoredMatchesPreview?.candidates ?? []).map(createAuthoredMatchSection);
  const status = resolveSurfaceStatus(readinessPreview, inventoryPreview, sourceSummary, authoredMatchesPreview);

  return {
    surfaceId: CSS_SASS_INSPECTOR_SURFACE_ID,
    title: CSS_SASS_INSPECTOR_TITLE,
    status,
    selectedNodePath: authoredMatchesPreview?.selectedNodePath || readinessPreview?.selectedNodePath || "none",
    targetRelativePath: authoredMatchesPreview?.targetRelativePath || readinessPreview?.targetRelativePath || inventoryPreview?.targetRelativePath || "none",
    sourceSummary,
    authoredMatchesSummary,
    sourceSections,
    ruleSections,
    authoredMatchSections,
    safetyNotes: collectSafetyNotes(readinessPreview, inventoryPreview, authoredMatchesPreview),
    blockedReason: resolveBlockedReason(status, readinessPreview, authoredMatchesPreview),
    message: resolveMessage(status, readinessPreview, authoredMatchesPreview),
    applyAffordance: createApplyAffordance(),
    sourceInventoryPreview: inventoryPreview,
    styleReadinessPreview: readinessPreview,
    authoredMatchesPreview
  };
}

function createSourceSummary(
  readinessPreview: SelectedNodeStyleReadinessPreview | null,
  inventoryPreview: StyleSourceInventoryPreview | null
): CSSSassInspectorSourceSummary {
  const sources = inventoryPreview?.sources ?? [];
  const linkedCssCount = sources.filter((source) => source.sourceKind === "linked-css").length;
  const linkedScssCount = sources.filter((source) => source.sourceKind === "linked-scss").length;

  return {
    linkedCssCount,
    linkedScssCount,
    inlineStyleBlockCount: inventoryPreview?.inlineStyleBlockCount ?? 0,
    inlineStyleAttributeCount: inventoryPreview?.inlineStyleAttributeCount ?? 0,
    unsupportedSourceCount: inventoryPreview?.unsupportedSourceCount ?? 0,
    missingSourceCount: inventoryPreview?.missingSourceCount ?? 0,
    totalSourceCount: sources.length,
    canInspectAuthoredStyles: readinessPreview?.canInspectAuthoredStyles ?? false,
    canInspectComputedStyles: false,
    canEditStyles: false,
    canApply: false
  };
}

function createAuthoredMatchesSummary(
  authoredMatchesPreview: SelectedNodeAuthoredStyleMatchesPreview | null
): CSSSassInspectorAuthoredMatchesSummary {
  return {
    status: authoredMatchesPreview?.status ?? "empty",
    matchedCandidateCount: authoredMatchesPreview?.matchedCandidateCount ?? 0,
    unsupportedCandidateCount: authoredMatchesPreview?.unsupportedCandidateCount ?? 0,
    notMatchedCandidateCount: authoredMatchesPreview?.notMatchedCandidateCount ?? 0,
    totalCandidateCount: authoredMatchesPreview?.totalCandidateCount ?? 0,
    canInspectComputedStyles: false,
    canApply: false
  };
}

function createSourceSection(source: StyleSourceReferencePreview): CSSSassInspectorSourceSection {
  return {
    sourceId: source.sourceId,
    label: createSourceLabel(source),
    sourceKind: source.sourceKind,
    relativePath: source.relativePath ?? "inline or unavailable",
    ownerHtmlRelativePath: source.ownerHtmlRelativePath ?? "unknown owner",
    status: source.status,
    media: source.media ?? "all",
    loadOrder: source.loadOrder,
    canReadSource: source.canReadSource,
    canWriteSource: false,
    blockedReason: source.blockedReason ?? "Read-only source inventory; source text is not loaded by this renderer surface.",
    safetyNotes: source.safetyNotes
  };
}

function createRuleSection(rule: StyleRulePreview): CSSSassInspectorRuleSection {
  return {
    ruleId: rule.ruleId,
    sourceId: rule.sourceId,
    status: rule.status,
    selectorLabels: rule.selectorPreviews.map((selector) => `${selector.selectorText} · ${selector.matchStatus}`),
    declarations: rule.declarationPreviews,
    canEdit: false,
    canApply: false,
    blockedReason: rule.blockedReason ?? "Rule preview is read-only and Apply remains unavailable.",
    safetyNotes: rule.safetyNotes
  };
}

function createAuthoredMatchSection(candidate: AuthoredStyleRuleMatchCandidatePreview): CSSSassInspectorAuthoredMatchSection {
  const selectorLabels = candidate.selectorMatches.map((selector) => `${selector.selectorText} · ${selector.status}`);
  const evidence = candidate.selectorMatches.flatMap((selector) => selector.evidence.length > 0 ? selector.evidence : [selector.unsupportedReason ?? selector.status]);
  const declarationLabels = candidate.declarationPreviews.map((declaration) => `${declaration.propertyName}: ${declaration.propertyValue}`);

  return {
    candidateId: candidate.candidateId,
    ruleId: candidate.ruleId,
    sourceId: candidate.sourceId,
    status: candidate.status,
    selectorLabels,
    declarationLabels,
    declarations: candidate.declarationPreviews,
    evidence,
    blockedReason: candidate.blockedReason ?? "Candidate match only — no cascade; Apply unavailable.",
    canEdit: false,
    canApply: false
  };
}

function resolveSurfaceStatus(
  readinessPreview: SelectedNodeStyleReadinessPreview | null,
  inventoryPreview: StyleSourceInventoryPreview | null,
  sourceSummary: CSSSassInspectorSourceSummary,
  authoredMatchesPreview: SelectedNodeAuthoredStyleMatchesPreview | null
): CSSSassInspectorSurfaceStatus {
  if (authoredMatchesPreview?.status === "blocked") return "blocked";
  if (authoredMatchesPreview && authoredMatchesPreview.status !== "empty") return "authored-matching";
  if (!readinessPreview || !inventoryPreview || sourceSummary.totalSourceCount === 0 || inventoryPreview.status === "empty") return "empty";
  if (readinessPreview.status === "blocked" || inventoryPreview.status === "blocked") return "blocked";
  if (readinessPreview.status === "unsupported") return "unsupported";
  if (sourceSummary.unsupportedSourceCount > 0 && sourceSummary.linkedCssCount === 0 && sourceSummary.inlineStyleBlockCount === 0) return "unsupported";
  return "inventory-only";
}

function resolveBlockedReason(
  status: CSSSassInspectorSurfaceStatus,
  readinessPreview: SelectedNodeStyleReadinessPreview | null,
  authoredMatchesPreview: SelectedNodeAuthoredStyleMatchesPreview | null
): string {
  if (status === "empty") return authoredMatchesPreview?.blockedReason ?? CSS_SASS_INSPECTOR_EMPTY_MESSAGE;
  if (status === "blocked") return authoredMatchesPreview?.blockedReason ?? readinessPreview?.blockedReason ?? CSS_SASS_INSPECTOR_BLOCKED_MESSAGE;
  if (status === "unsupported") return "Unsupported selector — requires future selector engine.";
  if (status === "authored-matching") return "Authored selector candidates from DOM Snapshot. Candidate match only — no cascade.";
  return readinessPreview?.blockedReason ?? "Inventory-only authored style inspection; Apply is unavailable.";
}

function resolveMessage(
  status: CSSSassInspectorSurfaceStatus,
  readinessPreview: SelectedNodeStyleReadinessPreview | null,
  authoredMatchesPreview: SelectedNodeAuthoredStyleMatchesPreview | null
): string {
  if (status === "authored-matching") return "Authored selector candidates from DOM Snapshot. Candidate match only — no cascade. Computed styles unavailable.";
  if (authoredMatchesPreview?.status === "empty") return "No authored matches from DOM Snapshot.";
  if (status === "inventory-only") return "Authored style inventory is available as a read-only preview. Cascade and computed styles remain unavailable.";
  if (status === "blocked") return authoredMatchesPreview?.blockedReason ?? readinessPreview?.blockedReason ?? CSS_SASS_INSPECTOR_BLOCKED_MESSAGE;
  if (status === "unsupported") return "Unsupported style sources are present; Sass/SCSS compilation and non-parseable sources are not inspected in Phase 8C.";
  return CSS_SASS_INSPECTOR_EMPTY_MESSAGE;
}

function collectSafetyNotes(
  readinessPreview: SelectedNodeStyleReadinessPreview | null,
  inventoryPreview: StyleSourceInventoryPreview | null,
  authoredMatchesPreview: SelectedNodeAuthoredStyleMatchesPreview | null
): readonly string[] {
  const notes = [
    ...CSS_SASS_INSPECTOR_SAFETY_NOTES,
    ...(inventoryPreview?.safetyNotes ?? []),
    ...(readinessPreview?.safetyNotes ?? []),
    ...(authoredMatchesPreview?.safetyNotes ?? [])
  ];
  return [...new Set(notes)];
}

function createApplyAffordance(): CSSSassInspectorApplyAffordance {
  return {
    label: CSS_SASS_INSPECTOR_APPLY_LABEL,
    ariaDisabled: true,
    dataDisabled: true,
    canApply: false
  };
}

function createSourceLabel(source: StyleSourceReferencePreview): string {
  const path = source.relativePath ?? source.ownerHtmlRelativePath ?? source.sourceId;
  return `${source.sourceKind} · ${path}`;
}
