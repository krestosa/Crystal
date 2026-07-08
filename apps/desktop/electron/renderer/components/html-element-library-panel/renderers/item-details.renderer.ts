import type { HtmlElementLibraryItem } from "../../../../../../../packages/core/project/html-element-library";
import { createShellMetadataRow } from "../../shell-ui/metadata-row/metadata-row";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";

export function renderHtmlElementLibraryItemDetails(elements: HtmlElementLibraryPanelElements, item: HtmlElementLibraryItem | null): void {
  elements.selectedEmpty.hidden = item !== null;
  elements.selectedPanel.hidden = item === null;

  if (!item) {
    elements.selectedEmpty.textContent = "Select an element";
    elements.selectedDetails.replaceChildren();
    return;
  }

  const attributeText = renderAttributes(item);
  const accessibilityText = renderOptionalValue(item.accessibilityNotes);
  const details = [
    attributeText === "none" ? null : createShellMetadataRow({ label: "Attrs", value: attributeText }),
    accessibilityText === "none" ? null : createShellMetadataRow({ label: "A11y", value: accessibilityText })
  ].filter((row): row is HTMLDivElement => row !== null);

  elements.selectedTitle.textContent = item.label;
  elements.selectedKind.textContent = item.tagName ? `<${item.tagName}>` : item.kind;
  elements.selectedDescription.textContent = item.description;
  elements.selectedDetails.hidden = details.length === 0;
  elements.selectedDetails.replaceChildren(...details);
}

function renderAttributes(item: HtmlElementLibraryItem): string {
  const required = item.requiredAttributes?.length ? `req ${item.requiredAttributes.join(", ")}` : "";
  const recommended = item.recommendedAttributes?.length ? `rec ${item.recommendedAttributes.join(", ")}` : "";
  const children = item.allowedChildrenHint ? `children ${item.allowedChildrenHint}` : "";
  return [required, recommended, children].filter(Boolean).join(" · ") || "none";
}

function renderOptionalValue(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized ? normalized : "none";
}
