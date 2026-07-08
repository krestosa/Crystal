import type { HtmlElementLibraryCategory, HtmlElementLibraryCategoryDefinition } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";

interface HtmlElementLibraryCategoryTabsRendererOptions {
  readonly elements: HtmlElementLibraryPanelElements;
  readonly categories: readonly HtmlElementLibraryCategoryDefinition[];
  readonly activeCategory: HtmlElementLibraryCategory;
  readonly getItemCount: (category: HtmlElementLibraryCategory) => number;
  readonly onSelectCategory: (category: HtmlElementLibraryCategory) => void;
}

export function renderHtmlElementLibraryCategoryTabs(options: HtmlElementLibraryCategoryTabsRendererOptions): void {
  const tabs = options.categories.map((category) => {
    const tab = document.createElement("button");
    const active = category.id === options.activeCategory;
    tab.type = "button";
    tab.className = "crystal-html-element-library-panel__category-tab crystal-shell-compact-button";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    tab.title = category.description;
    tab.dataset.htmlElementLibraryCategory = category.id;

    const label = document.createElement("span");
    label.className = "crystal-html-element-library-panel__category-label";
    label.textContent = category.label;

    const count = document.createElement("span");
    count.className = "crystal-html-element-library-panel__category-count crystal-shell-status-badge";
    count.textContent = String(options.getItemCount(category.id));

    tab.replaceChildren(label, count);
    tab.addEventListener("click", () => options.onSelectCategory(category.id));
    return tab;
  });

  options.elements.categoryTabs.replaceChildren(...tabs);
}
