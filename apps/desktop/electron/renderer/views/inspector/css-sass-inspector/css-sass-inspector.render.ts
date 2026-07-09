const CSS_SASS_INSPECTOR_RULE_PREVIEW_EMPTY_COPY = "Rule preview unavailable — source text not provided";
const CSS_SASS_INSPECTOR_COMPACT_MESSAGE = "Phase 8A inventory only. Writes, cascade, computed styles, refresh, undo/redo, and DOM mutation remain blocked.";
const CSS_SASS_INSPECTOR_COMPACT_SAFETY_NOTES = [
  "No real cascade is calculated",
  "No computed styles are read",
  "No Preview DOM mutation occurs",
  "No write IPC exists",
  "Apply remains unavailable"
] as const;

import type {
  CSSSassInspectorRuleSection,
  CSSSassInspectorSourceSection,
  CSSSassInspectorSurfaceElements,
  CSSSassInspectorSurfaceViewModel
} from "./css-sass-inspector.types";
import { validateCSSSassInspectorSurfaceViewModel } from "./css-sass-inspector.validation";
import type { StyleDeclarationPreview } from "../../../../../../../packages/core/style-engine";

export function renderCSSSassInspectorSurface(elements: CSSSassInspectorSurfaceElements, viewModel: CSSSassInspectorSurfaceViewModel): void {
  const validation = validateCSSSassInspectorSurfaceViewModel(viewModel);

  elements.cssSassInspectorStatus.textContent = viewModel.status;
  elements.cssSassInspectorMessage.textContent = validation.valid ? CSS_SASS_INSPECTOR_COMPACT_MESSAGE : validation.errors.join(" · ");
  elements.cssSassInspectorMessage.title = viewModel.message;
  elements.cssSassInspectorApplyUnavailableAffordance.textContent = viewModel.applyAffordance.label;
  elements.cssSassInspectorApplyUnavailableAffordance.setAttribute("aria-disabled", "true");
  elements.cssSassInspectorApplyUnavailableAffordance.setAttribute("data-disabled", "true");

  renderReadiness(elements.cssSassInspectorReadiness, viewModel);
  renderSources(elements, viewModel.sourceSections);
  renderRules(elements, viewModel.ruleSections);
  renderSafety(elements.cssSassInspectorSafety, viewModel);
}

function renderReadiness(container: HTMLDListElement, model: CSSSassInspectorSurfaceViewModel): void {
  container.replaceChildren(
    createDetailRow("Authored styles", model.sourceSummary.canInspectAuthoredStyles ? "available" : "unavailable"),
    createDetailRow("Computed styles", "unavailable"),
    createDetailRow("Apply", "unavailable"),
    createDetailRow("Selected node path", model.selectedNodePath),
    createDetailRow("Target file", model.targetRelativePath)
  );
}

function renderSources(elements: CSSSassInspectorSurfaceElements, sources: readonly CSSSassInspectorSourceSection[]): void {
  elements.cssSassInspectorSourcesEmpty.hidden = sources.length > 0;
  elements.cssSassInspectorSources.replaceChildren(...sources.map(createSourceItem));
}

function createSourceItem(source: CSSSassInspectorSourceSection): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "crystal-css-sass-inspector__source";
  item.title = createSourceBoundaryLabel(source);

  const heading = document.createElement("span");
  heading.className = "crystal-css-sass-inspector__source-label";
  heading.textContent = createCompactSourceLabel(source);

  const details = document.createElement("dl");
  details.className = "crystal-css-sass-inspector__source-details crystal-shell-metadata";
  details.append(
    createDetailRow("status", source.status),
    createDetailRow("write", source.canWriteSource ? "unexpected" : "unavailable")
  );

  item.append(heading, details);
  return item;
}

function renderRules(elements: CSSSassInspectorSurfaceElements, rules: readonly CSSSassInspectorRuleSection[]): void {
  elements.cssSassInspectorRulesEmpty.hidden = rules.length > 0;
  elements.cssSassInspectorRulesEmpty.textContent = CSS_SASS_INSPECTOR_RULE_PREVIEW_EMPTY_COPY;
  elements.cssSassInspectorRules.replaceChildren(...rules.map(createRuleItem));
}

function createRuleItem(rule: CSSSassInspectorRuleSection): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "crystal-css-sass-inspector__rule";
  item.title = rule.blockedReason;

  const heading = document.createElement("span");
  heading.className = "crystal-css-sass-inspector__rule-label";
  heading.textContent = `${rule.sourceId} · ${rule.status}`;

  const selectors = document.createElement("ul");
  selectors.className = "crystal-css-sass-inspector__selectors";
  selectors.append(...rule.selectorLabels.map(createCodeItem));

  const declarations = document.createElement("ul");
  declarations.className = "crystal-css-sass-inspector__declarations";
  declarations.append(...rule.declarations.map(createDeclarationItem));

  item.append(heading, selectors, declarations);
  return item;
}

function renderSafety(container: HTMLUListElement, model: CSSSassInspectorSurfaceViewModel): void {
  container.setAttribute("aria-label", model.safetyNotes.join(" · "));
  container.title = model.safetyNotes.join(" · ");
  container.replaceChildren(...CSS_SASS_INSPECTOR_COMPACT_SAFETY_NOTES.map(createSafetyItem));
}

function createDeclarationItem(declaration: StyleDeclarationPreview): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "crystal-css-sass-inspector__declaration";

  const code = document.createElement("code");
  code.textContent = `${declaration.propertyName}: ${declaration.propertyValue}${declaration.priority === "important" ? " !important" : ""}`;

  const status = document.createElement("span");
  status.textContent = `${declaration.status} · Apply unavailable`;

  item.append(code, status);
  return item;
}

function createCodeItem(value: string): HTMLLIElement {
  const item = document.createElement("li");
  const code = document.createElement("code");
  code.textContent = value;
  item.append(code);
  return item;
}

function createSafetyItem(value: string): HTMLLIElement {
  const item = document.createElement("li");
  item.textContent = value;
  return item;
}

function createCompactSourceLabel(source: CSSSassInspectorSourceSection): string {
  return `${source.sourceKind} — ${source.relativePath}`;
}

function createSourceBoundaryLabel(source: CSSSassInspectorSourceSection): string {
  return `${source.ownerHtmlRelativePath} · ${source.media} · ${source.blockedReason}`;
}

function createDetailRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  row.append(term, description);
  return row;
}
