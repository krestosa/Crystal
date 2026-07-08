import type { ProjectDomSnapshotState } from "../../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectGraph } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectPreviewState } from "../../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectPreviewSelectionState } from "../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import {
  getHtmlElementLibraryCategories,
  getHtmlElementLibraryItemsByCategory,
  selectHtmlInsertionTargetEligibility,
  type HtmlElementInsertionMode,
  type HtmlElementLibraryItem,
  type HtmlInsertionTargetEligibility
} from "../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "./html-element-library-panel.types";

let activeHtmlElementLibraryPanelCleanup: (() => void) | null = null;

export function initializeHtmlElementLibraryPanel(): void {
  activeHtmlElementLibraryPanelCleanup?.();

  const root = document.querySelector<HTMLElement>("[data-html-element-library-panel]");
  if (!root) return;

  const cleanup: Array<() => void> = [];
  const elements = getHtmlElementLibraryPanelElements(root);
  let selectedItem: HtmlElementLibraryItem | null = null;
  let latestProjectGraph: ProjectGraph | null = null;
  let latestPreviewState: ProjectPreviewState | null = null;
  let latestDomSnapshotState: ProjectDomSnapshotState | null = null;
  let latestPreviewSelectionState: ProjectPreviewSelectionState | null = null;

  const getEligibility = (): HtmlInsertionTargetEligibility => selectHtmlInsertionTargetEligibility({
    projectGraph: latestProjectGraph,
    preview: latestPreviewState,
    domSnapshot: latestDomSnapshotState,
    previewSelection: latestPreviewSelectionState
  });

  const render = (): void => {
    renderSelectedItem(elements, selectedItem);
    renderTargetEligibility(elements, getEligibility());
    renderPatchPreview(elements, selectedItem, getEligibility());
  };

  const selectItem = (item: HtmlElementLibraryItem): void => {
    selectedItem = item;
    syncPressedItem(elements, item.id);
    render();
  };

  renderCatalog(elements, selectItem);
  render();

  const refreshGraph = async (): Promise<void> => {
    try { latestProjectGraph = await window.crystal.project.getGraph(); }
    catch { latestProjectGraph = null; }
    render();
  };

  const handleProjectOpened = (): void => { void refreshGraph(); };
  const handlePreviewState = (state: ProjectPreviewState): void => {
    latestPreviewState = state;
    render();
  };
  const handleDomSnapshotState = (state: ProjectDomSnapshotState): void => {
    latestDomSnapshotState = state;
    render();
  };
  const handlePreviewSelectionState = (state: ProjectPreviewSelectionState): void => {
    latestPreviewSelectionState = state;
    render();
  };

  window.addEventListener("crystal:workspace-project-opened", handleProjectOpened);
  cleanup.push(() => window.removeEventListener("crystal:workspace-project-opened", handleProjectOpened));
  cleanup.push(window.crystal.project.onWatcherStateChanged(() => { void refreshGraph(); }));
  cleanup.push(window.crystal.project.onPreviewStateChanged(handlePreviewState));
  cleanup.push(window.crystal.project.onDomSnapshotStateChanged(handleDomSnapshotState));
  cleanup.push(window.crystal.project.onPreviewSelectionStateChanged(handlePreviewSelectionState));

  void refreshGraph();
  void window.crystal.project.getPreviewState().then(handlePreviewState).catch(() => { latestPreviewState = null; render(); });
  void window.crystal.project.getDomSnapshotState().then(handleDomSnapshotState).catch(() => { latestDomSnapshotState = null; render(); });
  void window.crystal.project.getPreviewSelectionState().then(handlePreviewSelectionState).catch(() => { latestPreviewSelectionState = null; render(); });

  activeHtmlElementLibraryPanelCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeHtmlElementLibraryPanelCleanup = null;
  };
}

function renderCatalog(elements: HtmlElementLibraryPanelElements, selectItem: (item: HtmlElementLibraryItem) => void): void {
  const categoryNodes = getHtmlElementLibraryCategories().map((category) => {
    const categoryNode = document.createElement("section");
    categoryNode.className = "crystal-html-element-library-panel__category";
    categoryNode.setAttribute("aria-label", category.label);

    const title = document.createElement("span");
    title.className = "crystal-html-element-library-panel__category-title";
    title.textContent = category.label;

    const itemList = document.createElement("div");
    itemList.className = "crystal-html-element-library-panel__items";

    const items = getHtmlElementLibraryItemsByCategory(category.id).map((item) => createCatalogItemButton(item, selectItem));
    itemList.replaceChildren(...items);
    categoryNode.replaceChildren(title, itemList);
    return categoryNode;
  });

  elements.categoryList.replaceChildren(...categoryNodes);
}

function createCatalogItemButton(item: HtmlElementLibraryItem, selectItem: (item: HtmlElementLibraryItem) => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "crystal-html-element-library-panel__item";
  button.setAttribute("aria-pressed", "false");
  button.title = "Command foundation only";
  button.dataset.htmlElementLibraryItem = item.id;
  button.dataset.htmlElementLibraryCommandState = "foundation-only";

  const label = document.createElement("span");
  label.className = "crystal-html-element-library-panel__item-label";
  label.textContent = item.label;

  const kind = document.createElement("span");
  kind.className = "crystal-html-element-library-panel__item-kind";
  kind.textContent = item.tagName ? `<${item.tagName}>` : item.kind;

  const description = document.createElement("span");
  description.className = "crystal-html-element-library-panel__item-description";
  description.textContent = item.description;

  button.replaceChildren(label, kind, description);
  button.addEventListener("click", () => selectItem(item));
  return button;
}

function syncPressedItem(elements: HtmlElementLibraryPanelElements, selectedId: string): void {
  for (const button of elements.categoryList.querySelectorAll<HTMLButtonElement>("[data-html-element-library-item]")) {
    button.setAttribute("aria-pressed", String(button.dataset.htmlElementLibraryItem === selectedId));
  }
}

function renderSelectedItem(elements: HtmlElementLibraryPanelElements, item: HtmlElementLibraryItem | null): void {
  elements.selectedTitle.textContent = item ? item.label : "None";
  elements.selectedKind.textContent = item ? renderItemKind(item) : "none";
  elements.selectedDescription.textContent = item?.description ?? "Select an item to inspect its read-only metadata.";
  elements.selectedAttributes.textContent = item ? renderAttributes(item) : "none";
  elements.selectedAccessibility.textContent = item?.accessibilityNotes ?? "none";
}

function renderTargetEligibility(elements: HtmlElementLibraryPanelElements, eligibility: HtmlInsertionTargetEligibility): void {
  elements.targetStatus.textContent = eligibility.label;
  elements.targetReason.textContent = eligibility.reason;
  if (eligibility.state !== "matched-target") {
    elements.targetDetails.textContent = "none";
    return;
  }
  elements.targetDetails.textContent = [
    `tag ${eligibility.targetTagName ?? "unknown"}`,
    `path ${eligibility.targetSnapshotPath ?? "unknown"}`,
    `file ${eligibility.targetFilePath ?? "unknown"}`,
    `modes ${renderModes(eligibility)}`
  ].join(" · ");
}

function renderPatchPreview(elements: HtmlElementLibraryPanelElements, item: HtmlElementLibraryItem | null, eligibility: HtmlInsertionTargetEligibility): void {
  if (!item) {
    elements.patchPreview.textContent = "Patch preview not implemented. Select an item to inspect future command metadata.";
    elements.futureAction.disabled = true;
    return;
  }

  if (eligibility.state !== "matched-target") {
    elements.patchPreview.textContent = `Patch preview not implemented. ${eligibility.label}: ${eligibility.reason}`;
    elements.futureAction.disabled = true;
    return;
  }

  elements.patchPreview.textContent = [
    "Patch preview not implemented.",
    "Insertion will be applied through validated commands.",
    `Selected item: ${item.label}.`,
    `Target: ${eligibility.targetTagName ?? "unknown"} at ${eligibility.targetSnapshotPath ?? "unknown"}.`,
    `Available modes: ${renderModes(eligibility)}.`
  ].join(" ");
  elements.futureAction.disabled = true;
}

function renderItemKind(item: HtmlElementLibraryItem): string {
  return item.tagName ? `${item.kind} · <${item.tagName}>` : item.kind;
}

function renderAttributes(item: HtmlElementLibraryItem): string {
  const required = item.requiredAttributes?.length ? `required: ${item.requiredAttributes.join(", ")}` : "required: none";
  const recommended = item.recommendedAttributes?.length ? `recommended: ${item.recommendedAttributes.join(", ")}` : "recommended: none";
  const children = item.allowedChildrenHint ? `children: ${item.allowedChildrenHint}` : "children: not specified";
  return `${required} · ${recommended} · ${children}`;
}

function renderModes(eligibility: HtmlInsertionTargetEligibility): string {
  const modes: HtmlElementInsertionMode[] = [];
  if (eligibility.canInsertBefore) modes.push("before");
  if (eligibility.canInsertAfter) modes.push("after");
  if (eligibility.canInsertInside) modes.push("inside");
  return modes.length ? modes.join(", ") : "none";
}

function getHtmlElementLibraryPanelElements(root: HTMLElement): HtmlElementLibraryPanelElements {
  const query = <TElement extends HTMLElement>(selector: string, elementType: new () => TElement) => queryHtmlElementLibraryPanelElement(root, selector, elementType);
  return {
    root,
    categoryList: query("[data-html-element-library-categories]", HTMLElement),
    selectedTitle: query("[data-html-element-library-selected-title]", HTMLElement),
    selectedKind: query("[data-html-element-library-selected-kind]", HTMLElement),
    selectedDescription: query("[data-html-element-library-selected-description]", HTMLElement),
    selectedAttributes: query("[data-html-element-library-selected-attributes]", HTMLElement),
    selectedAccessibility: query("[data-html-element-library-selected-accessibility]", HTMLElement),
    targetStatus: query("[data-html-element-library-target-status]", HTMLElement),
    targetReason: query("[data-html-element-library-target-reason]", HTMLElement),
    targetDetails: query("[data-html-element-library-target-details]", HTMLElement),
    patchPreview: query("[data-html-element-library-patch-preview]", HTMLElement),
    futureAction: query("[data-html-element-library-future-action]", HTMLButtonElement)
  };
}

function queryHtmlElementLibraryPanelElement<TElement extends HTMLElement>(root: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Element Library panel element: ${selector}`);
  return element;
}
