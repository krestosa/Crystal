import type { HtmlElementLibraryCategory, HtmlElementLibraryCategoryDefinition } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";
import { createHtmlElementLibraryButton, createHtmlElementLibraryText } from "./html-element-library-control-blocks.renderer";

interface HtmlElementLibraryCategoryTabsRendererOptions {
  readonly elements: HtmlElementLibraryPanelElements;
  readonly categories: readonly HtmlElementLibraryCategoryDefinition[];
  readonly activeCategory: HtmlElementLibraryCategory;
  readonly getItemCount: (category: HtmlElementLibraryCategory) => number;
  readonly onSelectCategory: (category: HtmlElementLibraryCategory) => void;
}

export function renderHtmlElementLibraryCategoryTabs(options: HtmlElementLibraryCategoryTabsRendererOptions): void {
  const tabs = options.categories.map((category) => {
    const tab = createHtmlElementLibraryButton("crystal-html-element-library-panel__category-tab", category.label);
    const active = category.id === options.activeCategory;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    tab.title = category.description;
    tab.dataset.htmlElementLibraryCategory = category.id;

    const label = createHtmlElementLibraryText("span", "crystal-html-element-library-panel__category-label", category.label);
    const count = createHtmlElementLibraryText("span", "crystal-html-element-library-panel__category-count", String(options.getItemCount(category.id)));
    tab.replaceChildren(label, count);
    tab.addEventListener("click", () => options.onSelectCategory(category.id));
    return tab;
  });

  options.elements.categoryTabs.replaceChildren(...tabs);
}
