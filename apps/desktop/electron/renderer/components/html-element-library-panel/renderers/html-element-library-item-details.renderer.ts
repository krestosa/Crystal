import type { HtmlElementLibraryItem } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";
import { formatHtmlElementLibraryCompactValue, setHtmlElementLibraryHidden } from "./html-element-library-control-blocks.renderer";

export function renderHtmlElementLibraryItemDetails(elements: HtmlElementLibraryPanelElements, item: HtmlElementLibraryItem | null): void {
  setHtmlElementLibraryHidden(elements.selectedEmpty, item !== null);
  setHtmlElementLibraryHidden(elements.selectedPanel, item === null);

  if (!item) {
    elements.selectedEmpty.textContent = "Select an element";
    return;
  }

  const attributeText = renderAttributes(item);
  const accessibilityText = formatHtmlElementLibraryCompactValue(item.accessibilityNotes);
  elements.selectedTitle.textContent = item.label;
  elements.selectedKind.textContent = item.tagName ? `<${item.tagName}>` : item.kind;
  elements.selectedDescription.textContent = item.description;
  elements.selectedAttributes.textContent = attributeText;
  elements.selectedAccessibility.textContent = accessibilityText;
  setHtmlElementLibraryHidden(elements.selectedAttributesRow, attributeText === "none");
  setHtmlElementLibraryHidden(elements.selectedAccessibilityRow, accessibilityText === "none");
}

function renderAttributes(item: HtmlElementLibraryItem): string {
  const required = item.requiredAttributes?.length ? `req ${item.requiredAttributes.join(", ")}` : "";
  const recommended = item.recommendedAttributes?.length ? `rec ${item.recommendedAttributes.join(", ")}` : "";
  const children = item.allowedChildrenHint ? `children ${item.allowedChildrenHint}` : "";
  return [required, recommended, children].filter(Boolean).join(" · ") || "none";
}
