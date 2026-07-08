import type { HtmlElementLibraryItem, HtmlInsertionTargetEligibility } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";
import { setHtmlElementLibraryHidden } from "./html-element-library-control-blocks.renderer";
import { renderHtmlElementLibraryModes } from "./html-element-library-target-status.renderer";

export function renderHtmlElementLibraryCommandPreview(elements: HtmlElementLibraryPanelElements, item: HtmlElementLibraryItem | null, eligibility: HtmlInsertionTargetEligibility): void {
  elements.futureAction.disabled = true;

  if (!item) {
    elements.patchPreview.textContent = "Preview: select an element";
    setHtmlElementLibraryHidden(elements.futureAction, true);
    return;
  }

  if (eligibility.state !== "matched-target") {
    elements.patchPreview.textContent = `Preview: locked · ${eligibility.label}`;
    setHtmlElementLibraryHidden(elements.futureAction, true);
    return;
  }

  elements.patchPreview.textContent = `Preview: read-only · ${renderHtmlElementLibraryModes(eligibility)}`;
  setHtmlElementLibraryHidden(elements.futureAction, false);
}
