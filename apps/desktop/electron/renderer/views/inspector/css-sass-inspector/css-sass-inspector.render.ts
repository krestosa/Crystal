import { CSS_SASS_INSPECTOR_RULES_UNAVAILABLE } from "./css-sass-inspector.constants";
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
  elements.cssSassInspectorMessage.textContent = validation.valid ? viewModel.message : validation.errors.join(" · ");
  elements.cssSassInspectorApplyUnavailableAffordance.textContent = viewModel.applyAffordance.label;
  elements.cssSassInspectorApplyUnavailableAffordance.setAttribute("aria-disabled", "true");
  elements.cssSassInspectorApplyUnavailableAffordance.setAttribute("data-disabled", "true");

  renderReadiness(elements.cssSassInspectorReadiness, viewModel);
  renderSources(elements, viewModel.sourceSections);
  renderRules(elements, viewModel.ruleSections);
  elements.cssSassInspectorSafety.replaceChildren(...viewModel.safetyNotes.map(createSafetyItem));
}

function renderReadiness(container: HTMLDListElement, model: CSSSassInspectorSurfaceViewModel): void {
  container.replaceChildren(
    createDetailRow("Status", model.status),
    createDetailRow("Selected node path", model.selectedNodePath),
    createDetailRow("Target file", model.targetRelativePath),
    createDetailRow("Authored styles", model.sourceSummary.canInspectAuthoredStyles ? "available" : "unavailable"),
    createDetailRow("Computed styles", "unavailable"),
    createDetailRow("Apply", "unavailable"),
    createDetailRow("Blocked", model.blockedReason)
  );
}

function renderSources(elements: CSSSassInspectorSurfaceElements, sources: readonly CSSSassInspectorSourceSection[]): void {
  elements.cssSassInspectorSourcesEmpty.hidden = sources.length > 0;
  elements.cssSassInspectorSources.replaceChildren(...sources.map(createSourceItem));
}

function createSourceItem(source: CSSSassInspectorSourceSection): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "crystal-css-sass-inspector__source";

  const heading = document.createElement("span");
  heading.className = "crystal-css-sass-inspector__source-label";
  heading.textContent = source.label;

  const details = document.createElement("dl");
  details.className = "crystal-css-sass-inspector__source-details crystal-shell-metadata";
  details.append(
    createDetailRow("kind", source.sourceKind),
    createDetailRow("path", source.relativePath),
    createDetailRow("status", source.status),
    createDetailRow("media", source.media),
    createDetailRow("load order", String(source.loadOrder)),
    createDetailRow("write", source.canWriteSource ? "unexpected" : "unavailable"),
    createDetailRow("blocked", source.blockedReason)
  );

  item.append(heading, details);
  return item;
}

function renderRules(elements: CSSSassInspectorSurfaceElements, rules: readonly CSSSassInspectorRuleSection[]): void {
  elements.cssSassInspectorRulesEmpty.hidden = rules.length > 0;
  elements.cssSassInspectorRulesEmpty.textContent = CSS_SASS_INSPECTOR_RULES_UNAVAILABLE;
  elements.cssSassInspectorRules.replaceChildren(...rules.map(createRuleItem));
}

function createRuleItem(rule: CSSSassInspectorRuleSection): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "crystal-css-sass-inspector__rule";

  const heading = document.createElement("span");
  heading.className = "crystal-css-sass-inspector__rule-label";
  heading.textContent = `${rule.sourceId} · ${rule.status}`;

  const selectors = document.createElement("ul");
  selectors.className = "crystal-css-sass-inspector__selectors";
  selectors.append(...rule.selectorLabels.map(createCodeItem));

  const declarations = document.createElement("ul");
  declarations.className = "crystal-css-sass-inspector__declarations";
  declarations.append(...rule.declarations.map(createDeclarationItem));

  const blocked = document.createElement("p");
  blocked.className = "crystal-css-sass-inspector__blocked";
  blocked.textContent = rule.blockedReason;

  item.append(heading, selectors, declarations, blocked);
  return item;
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

function createDetailRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  row.append(term, description);
  return row;
}
