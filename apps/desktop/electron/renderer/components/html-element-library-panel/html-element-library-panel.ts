import {
  getHtmlElementLibraryCategories,
  getHtmlElementLibraryItemsByCategory,
  selectHtmlInsertionTargetEligibility,
  type HtmlElementLibraryCategory,
  type HtmlElementLibraryItem
} from "../../../../../../packages/core/project/html-element-library";
import { getHtmlElementLibraryPanelElements } from "./html-element-library-panel.dom";
import { bindHtmlElementLibraryPanelEvents } from "./html-element-library-panel.events";
import { createHtmlElementLibraryPanelState, type HtmlElementLibraryPanelRuntimeState } from "./html-element-library-panel.state";
import type { HtmlElementLibraryPanelElements } from "./html-element-library-panel.types";
import { renderHtmlElementLibraryCategoryTabs } from "./renderers/category-tabs.renderer";
import { renderHtmlElementLibraryCommandPreview } from "./renderers/command-preview.renderer";
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
  renderHtmlElementLibraryCommandPreview(elements, state.selectedItem, eligibility);
}

function getCategoryItemCount(category: HtmlElementLibraryCategory): number {
  return getHtmlElementLibraryItemsByCategory(category).length;
}
