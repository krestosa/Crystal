import type { HtmlElementInsertionMode, HtmlInsertionTargetEligibility } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";

const INSERTION_MODES: readonly HtmlElementInsertionMode[] = ["before", "after", "inside"];

interface HtmlElementLibraryInsertionModePickerOptions {
  readonly elements: HtmlElementLibraryPanelElements;
  readonly selectedMode: HtmlElementInsertionMode;
  readonly eligibility: HtmlInsertionTargetEligibility;
  readonly onSelectMode: (mode: HtmlElementInsertionMode) => void;
}

export function renderHtmlElementLibraryInsertionModePicker(options: HtmlElementLibraryInsertionModePickerOptions): void {
  const label = document.createElement("span");
  label.className = "crystal-html-element-library-panel__mode-label";
  label.textContent = "Mode";

  const buttons = INSERTION_MODES.map((mode) => createModeButton(options, mode));
  options.elements.insertionModePicker.replaceChildren(label, ...buttons);
}

function createModeButton(options: HtmlElementLibraryInsertionModePickerOptions, mode: HtmlElementInsertionMode): HTMLButtonElement {
  const button = document.createElement("button");
  const eligible = isEligibleMode(options.eligibility, mode);
  const supportedInPreview = mode === "before";
  button.type = "button";
  button.className = "crystal-html-element-library-panel__mode-button crystal-shell-compact-button";
  button.textContent = mode;
  button.disabled = !eligible || !supportedInPreview;
  button.setAttribute("aria-pressed", String(options.selectedMode === mode));
  button.title = getModeTitle(mode, eligible, supportedInPreview);
  button.addEventListener("click", () => options.onSelectMode(mode));
  return button;
}

function isEligibleMode(eligibility: HtmlInsertionTargetEligibility, mode: HtmlElementInsertionMode): boolean {
  if (mode === "before") return eligibility.canInsertBefore;
  if (mode === "after") return eligibility.canInsertAfter;
  return eligibility.canInsertInside;
}

function getModeTitle(mode: HtmlElementInsertionMode, eligible: boolean, supportedInPreview: boolean): string {
  if (!eligible) return `${mode} is not eligible for the current target.`;
  if (!supportedInPreview) return `${mode} requires end-tag source location support.`;
  return `${mode} insertion preview`;
}
