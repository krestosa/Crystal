import type { HtmlElementLibraryItem } from "../../../../../../../packages/core/project/html-element-library";
import { createShellEmptyState } from "../../shell-ui/empty-state/empty-state";
import { HTML_ELEMENT_LIBRARY_COMMAND_STATE } from "../html-element-library-panel.constants";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";

interface HtmlElementLibraryItemListRendererOptions {
  readonly elements: HtmlElementLibraryPanelElements;
  readonly items: readonly HtmlElementLibraryItem[];
  readonly selectedItem: HtmlElementLibraryItem | null;
  readonly onSelectItem: (item: HtmlElementLibraryItem) => void;
}

export function renderHtmlElementLibraryItemList(options: HtmlElementLibraryItemListRendererOptions): void {
  if (options.items.length === 0) {
    options.elements.itemList.replaceChildren(createShellEmptyState({ message: "No items", compact: true }));
    return;
  }

  const itemNodes = options.items.map((item) => createItemButton(item, options.selectedItem?.id === item.id, options.onSelectItem));
  options.elements.itemList.replaceChildren(...itemNodes);
}

function createItemButton(item: HtmlElementLibraryItem, selected: boolean, onSelectItem: (item: HtmlElementLibraryItem) => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "crystal-html-element-library-panel__item crystal-shell-compact-button";
  button.setAttribute("aria-pressed", String(selected));
  button.title = `${item.label} · read-only metadata`;
  button.dataset.htmlElementLibraryItem = item.id;
  button.dataset.htmlElementLibraryCommandState = HTML_ELEMENT_LIBRARY_COMMAND_STATE;

  const label = document.createElement("span");
  label.className = "crystal-html-element-library-panel__item-label";
  label.textContent = item.label;

  const tag = document.createElement("span");
  tag.className = "crystal-html-element-library-panel__item-tag crystal-shell-status-badge";
  tag.textContent = item.tagName ? `<${item.tagName}>` : item.kind;

  button.replaceChildren(label, tag);
  button.addEventListener("click", () => onSelectItem(item));
  return button;
}
