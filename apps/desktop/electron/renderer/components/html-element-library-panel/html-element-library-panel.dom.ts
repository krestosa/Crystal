import type { HtmlElementLibraryPanelElements } from "./html-element-library-panel.types";

export function getHtmlElementLibraryPanelElements(root: HTMLElement): HtmlElementLibraryPanelElements {
  const query = <TElement extends HTMLElement>(selector: string, elementType: new () => TElement) => queryHtmlElementLibraryPanelElement(root, selector, elementType);
  return {
    root,
    categoryTabs: query("[data-html-element-library-category-tabs]", HTMLElement),
    itemList: query("[data-html-element-library-item-list]", HTMLElement),
    selectedEmpty: query("[data-html-element-library-selected-empty]", HTMLElement),
    selectedPanel: query("[data-html-element-library-selected-panel]", HTMLElement),
    selectedTitle: query("[data-html-element-library-selected-title]", HTMLElement),
    selectedKind: query("[data-html-element-library-selected-kind]", HTMLElement),
    selectedDescription: query("[data-html-element-library-selected-description]", HTMLElement),
    selectedDetails: query("[data-html-element-library-selected-details]", HTMLElement),
    targetSummary: query("[data-html-element-library-target-summary]", HTMLElement),
    patchPreview: query("[data-html-element-library-patch-preview]", HTMLElement),
    futureAction: query("[data-html-element-library-future-action]", HTMLButtonElement)
  };
}

function queryHtmlElementLibraryPanelElement<TElement extends HTMLElement>(root: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Element Library panel element: ${selector}`);
  return element;
}
