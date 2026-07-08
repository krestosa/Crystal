import type { HtmlElementInsertionMode, HtmlInsertionTargetEligibility } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";

export function renderHtmlElementLibraryTargetStatus(elements: HtmlElementLibraryPanelElements, eligibility: HtmlInsertionTargetEligibility): void {
  elements.targetSummary.textContent = `Target: ${renderTargetSummary(eligibility)}`;
  elements.targetSummary.title = eligibility.reason;
}

function renderTargetSummary(eligibility: HtmlInsertionTargetEligibility): string {
  if (eligibility.state !== "matched-target") return eligibility.label;
  return `<${eligibility.targetTagName ?? "element"}> · ${renderHtmlElementLibraryModes(eligibility)}`;
}

export function renderHtmlElementLibraryModes(eligibility: HtmlInsertionTargetEligibility): string {
  const modes: HtmlElementInsertionMode[] = [];
  if (eligibility.canInsertBefore) modes.push("before");
  if (eligibility.canInsertAfter) modes.push("after");
  if (eligibility.canInsertInside) modes.push("inside");
  return modes.length ? modes.join(" ") : "none";
}
