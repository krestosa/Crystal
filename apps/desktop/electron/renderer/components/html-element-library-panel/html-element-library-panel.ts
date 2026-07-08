import {
  getHtmlElementLibraryCategories,
  getHtmlElementLibraryItemsByCategory,
  selectHtmlInsertionTargetEligibility,
  type HtmlElementInsertionMode,
  type HtmlElementLibraryCategory,
  type HtmlElementLibraryItem,
  type HtmlInsertionTargetEligibility
} from "../../../../../../packages/core/project/html-element-library";
import {
  ADD_HTML_ELEMENT_COMMAND_KIND,
  HTML_ELEMENT_LIBRARY_COMMAND_SOURCE,
  previewAddHtmlElementCommand
} from "../../../../../../packages/core/commands/html-insertion";
import type { AddHtmlElementCommand } from "../../../../../../packages/core/commands/html-insertion";
import { getHtmlElementLibraryPanelElements } from "./html-element-library-panel.dom";
import { bindHtmlElementLibraryPanelEvents } from "./html-element-library-panel.events";
import { createHtmlElementLibraryPanelState, type HtmlElementLibraryPanelRuntimeState } from "./html-element-library-panel.state";
import type { HtmlElementLibraryPanelElements } from "./html-element-library-panel.types";
import { renderHtmlElementLibraryCategoryTabs } from "./renderers/category-tabs.renderer";
import { renderHtmlElementLibraryCommandPreview } from "./renderers/command-preview.renderer";
import { renderHtmlElementLibraryInsertionModePicker } from "./renderers/insertion-mode-picker.renderer";
import { renderHtmlElementLibraryItemDetails } from "./renderers/item-details.renderer";
import { renderHtmlElementLibraryItemList } from "./renderers/item-list.renderer";
import { renderHtmlElementLibraryTargetStatus } from "./renderers/target-status.renderer";

let activeHtmlElementLibraryPanelCleanup: (() => void) | null = null;

export function initializeHtmlElementLibraryPanel(): void {
  activeHtmlElementLibraryPanelCleanup?.();

  const root = document.querySelector<HTMLElement>("[data-html-element-library-panel]");
  if (!root) return;

  const elements = getHtmlElementLibraryPanelElements(root);
  const state = createHtmlElementLibraryPanelState();
  const render = (): void => renderHtmlElementLibraryPanel(elements, state);

  render();

  const cleanupProjectEvents = bindHtmlElementLibraryPanelEvents({ state, render });
  activeHtmlElementLibraryPanelCleanup = () => {
    cleanupProjectEvents();
    activeHtmlElementLibraryPanelCleanup = null;
  };
}

function renderHtmlElementLibraryPanel(elements: HtmlElementLibraryPanelElements, state: HtmlElementLibraryPanelRuntimeState): void {
  const categories = getHtmlElementLibraryCategories();
  const activeItems = getHtmlElementLibraryItemsByCategory(state.activeCategory);
  const eligibility = selectHtmlInsertionTargetEligibility({
    projectGraph: state.latestProjectGraph,
    preview: state.latestPreviewState,
    domSnapshot: state.latestDomSnapshotState,
    previewSelection: state.latestPreviewSelectionState
  });
  state.insertionMode = normalizeInsertionModeForEligibility(state.insertionMode, eligibility);
  const commandPreview = state.selectedItem
    ? previewAddHtmlElementCommand(createPreviewCommand(state.selectedItem, eligibility, state.insertionMode), {
        domSnapshotState: state.latestDomSnapshotState,
        previewState: state.latestPreviewState,
        previewSelectionState: state.latestPreviewSelectionState,
        projectGraph: state.latestProjectGraph,
        selectedElementLibraryItem: state.selectedItem,
        targetEligibility: eligibility
      })
    : null;

  renderHtmlElementLibraryCategoryTabs({
    elements,
    categories,
    activeCategory: state.activeCategory,
    getItemCount: getCategoryItemCount,
    onSelectCategory: (category: HtmlElementLibraryCategory) => {
      state.activeCategory = category;
      renderHtmlElementLibraryPanel(elements, state);
    }
  });
  renderHtmlElementLibraryItemList({
    elements,
    items: activeItems,
    selectedItem: state.selectedItem,
    onSelectItem: (item: HtmlElementLibraryItem) => {
      state.selectedItem = item;
      renderHtmlElementLibraryPanel(elements, state);
    }
  });
  renderHtmlElementLibraryItemDetails(elements, state.selectedItem);
  renderHtmlElementLibraryTargetStatus(elements, eligibility);
  renderHtmlElementLibraryInsertionModePicker({
    elements,
    selectedMode: state.insertionMode,
    eligibility,
    onSelectMode: (mode: HtmlElementInsertionMode) => {
      state.insertionMode = mode;
      renderHtmlElementLibraryPanel(elements, state);
    }
  });
  renderHtmlElementLibraryCommandPreview(elements, state.selectedItem, eligibility, commandPreview);
}

function getCategoryItemCount(category: HtmlElementLibraryCategory): number {
  return getHtmlElementLibraryItemsByCategory(category).length;
}

function createPreviewCommand(item: HtmlElementLibraryItem, eligibility: HtmlInsertionTargetEligibility, insertionMode: HtmlElementInsertionMode): AddHtmlElementCommand {
  return {
    commandId: `preview-${item.id}-${eligibility.targetSnapshotPath ?? "none"}-${insertionMode}`,
    kind: ADD_HTML_ELEMENT_COMMAND_KIND,
    elementId: item.id,
    targetFilePath: eligibility.targetFilePath ?? "",
    targetSnapshotPath: eligibility.targetSnapshotPath ?? "",
    insertionMode,
    requestedAt: Date.now(),
    source: HTML_ELEMENT_LIBRARY_COMMAND_SOURCE
  };
}

function normalizeInsertionModeForEligibility(mode: HtmlElementInsertionMode, eligibility: HtmlInsertionTargetEligibility): HtmlElementInsertionMode {
  if (mode === "before" && eligibility.canInsertBefore) return mode;
  if (mode === "after" && eligibility.canInsertAfter) return mode;
  if (mode === "inside" && eligibility.canInsertInside) return mode;
  return "before";
}
