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
  CSSSassInspectorRuleSection,
  CSSSassInspectorSourceSection,
  CSSSassInspectorSourceSummary,
  CSSSassInspectorSurfaceInput,
  CSSSassInspectorSurfaceStatus,
  CSSSassInspectorSurfaceViewModel
} from "./css-sass-inspector.types";
import type {
  SelectedNodeStyleReadinessPreview,
  StyleRulePreview,
  StyleSourceInventoryPreview,
  StyleSourceReferencePreview
} from "../../../../../../../packages/core/style-engine";

export function createCSSSassInspectorSurfaceViewModel(input: CSSSassInspectorSurfaceInput): CSSSassInspectorSurfaceViewModel {
  const readinessPreview = input.readinessPreview ?? null;
  const inventoryPreview = readinessPreview?.inventoryPreview ?? null;
  const sourceSummary = createSourceSummary(readinessPreview, inventoryPreview);
  const sourceSections = (inventoryPreview?.sources ?? []).map(createSourceSection);
  const ruleSections = (input.rulePreviews ?? []).map(createRuleSection);
  const status = resolveSurfaceStatus(readinessPreview, inventoryPreview, sourceSummary);

  return {
    surfaceId: CSS_SASS_INSPECTOR_SURFACE_ID,
    title: CSS_SASS_INSPECTOR_TITLE,
    status,
    selectedNodePath: readinessPreview?.selectedNodePath || "none",
    targetRelativePath: readinessPreview?.targetRelativePath || inventoryPreview?.targetRelativePath || "none",
    sourceSummary,
    sourceSections,
    ruleSections,
    safetyNotes: collectSafetyNotes(readinessPreview, inventoryPreview),
    blockedReason: resolveBlockedReason(status, readinessPreview),
    message: resolveMessage(status, readinessPreview),
    applyAffordance: createApplyAffordance(),
    sourceInventoryPreview: inventoryPreview,
    styleReadinessPreview: readinessPreview
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

function resolveSurfaceStatus(
  readinessPreview: SelectedNodeStyleReadinessPreview | null,
  inventoryPreview: StyleSourceInventoryPreview | null,
  sourceSummary: CSSSassInspectorSourceSummary
): CSSSassInspectorSurfaceStatus {
  if (!readinessPreview || !inventoryPreview || sourceSummary.totalSourceCount === 0 || inventoryPreview.status === "empty") return "empty";
  if (readinessPreview.status === "blocked" || inventoryPreview.status === "blocked") return "blocked";
  if (readinessPreview.status === "unsupported") return "unsupported";
  if (sourceSummary.unsupportedSourceCount > 0 && sourceSummary.linkedCssCount === 0 && sourceSummary.inlineStyleBlockCount === 0) return "unsupported";
  return "inventory-only";
}

function resolveBlockedReason(status: CSSSassInspectorSurfaceStatus, readinessPreview: SelectedNodeStyleReadinessPreview | null): string {
  if (status === "empty") return CSS_SASS_INSPECTOR_EMPTY_MESSAGE;
  if (status === "blocked") return readinessPreview?.blockedReason ?? CSS_SASS_INSPECTOR_BLOCKED_MESSAGE;
  if (status === "unsupported") return "Unsupported source inventory; Sass/SCSS compilation, Sass import resolution, and non-parseable sources remain out of scope.";
  return readinessPreview?.blockedReason ?? "Inventory-only authored style inspection; Apply is unavailable.";
}

function resolveMessage(status: CSSSassInspectorSurfaceStatus, readinessPreview: SelectedNodeStyleReadinessPreview | null): string {
  if (status === "inventory-only") return "Authored style inventory is available as a read-only preview. Cascade and computed styles remain unavailable.";
  if (status === "blocked") return readinessPreview?.blockedReason ?? CSS_SASS_INSPECTOR_BLOCKED_MESSAGE;
  if (status === "unsupported") return "Unsupported style sources are present; Sass/SCSS compilation and non-parseable sources are not inspected in Phase 8B.";
  return CSS_SASS_INSPECTOR_EMPTY_MESSAGE;
}

function collectSafetyNotes(
  readinessPreview: SelectedNodeStyleReadinessPreview | null,
  inventoryPreview: StyleSourceInventoryPreview | null
): readonly string[] {
  const notes = [
    ...CSS_SASS_INSPECTOR_SAFETY_NOTES,
    ...(inventoryPreview?.safetyNotes ?? []),
    ...(readinessPreview?.safetyNotes ?? [])
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
