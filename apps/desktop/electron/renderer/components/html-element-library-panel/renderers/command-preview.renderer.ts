import type { HtmlElementLibraryItem, HtmlInsertionTargetEligibility } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";
import { renderHtmlElementLibraryModes } from "./target-status.renderer";

export function renderHtmlElementLibraryCommandPreview(elements: HtmlElementLibraryPanelElements, item: HtmlElementLibraryItem | null, eligibility: HtmlInsertionTargetEligibility): void {
  elements.futureAction.disabled = true;

  if (!item) {
    elements.patchPreview.textContent = "Preview: select an element";
    elements.futureAction.hidden = true;
    return;
  }

  if (eligibility.state !== "matched-target") {
    elements.patchPreview.textContent = `Preview: locked · ${eligibility.label}`;
    elements.futureAction.hidden = true;
    return;
  }

  elements.patchPreview.textContent = `Preview: read-only · ${renderHtmlElementLibraryModes(eligibility)}`;
  elements.futureAction.hidden = false;
}
