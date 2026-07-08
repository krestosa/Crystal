import type { HtmlElementLibraryItem } from "../../../../../../../packages/core/project/html-element-library";
import { HTML_ELEMENT_LIBRARY_COMMAND_STATE } from "../html-element-library-panel.constants";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";
import { createHtmlElementLibraryButton, createHtmlElementLibraryText } from "./html-element-library-control-blocks.renderer";

interface HtmlElementLibraryItemListRendererOptions {
  readonly elements: HtmlElementLibraryPanelElements;
  readonly items: readonly HtmlElementLibraryItem[];
  readonly selectedItem: HtmlElementLibraryItem | null;
  readonly onSelectItem: (item: HtmlElementLibraryItem) => void;
}

export function renderHtmlElementLibraryItemList(options: HtmlElementLibraryItemListRendererOptions): void {
  if (options.items.length === 0) {
    const empty = createHtmlElementLibraryText("p", "crystal-html-element-library-panel__item-empty", "No items");
    options.elements.itemList.replaceChildren(empty);
    return;
  }

  const itemNodes = options.items.map((item) => createItemButton(item, options.selectedItem?.id === item.id, options.onSelectItem));
  options.elements.itemList.replaceChildren(...itemNodes);
}

function createItemButton(item: HtmlElementLibraryItem, selected: boolean, onSelectItem: (item: HtmlElementLibraryItem) => void): HTMLButtonElement {
  const button = createHtmlElementLibraryButton("crystal-html-element-library-panel__item", item.label);
  button.setAttribute("aria-pressed", String(selected));
  button.title = `${item.label} · read-only metadata`;
  button.dataset.htmlElementLibraryItem = item.id;
  button.dataset.htmlElementLibraryCommandState = HTML_ELEMENT_LIBRARY_COMMAND_STATE;

  const label = createHtmlElementLibraryText("span", "crystal-html-element-library-panel__item-label", item.label);
  const tag = createHtmlElementLibraryText("span", "crystal-html-element-library-panel__item-tag", item.tagName ? `<${item.tagName}>` : item.kind);
  button.replaceChildren(label, tag);
  button.addEventListener("click", () => onSelectItem(item));
  return button;
}
