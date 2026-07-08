import type { CommandPreviewResult } from "../../../../../../../packages/core/commands/command-preview-bus";
import type { HtmlElementLibraryItem, HtmlInsertionTargetEligibility } from "../../../../../../../packages/core/project/html-element-library";
import type { HtmlElementLibraryPanelElements } from "../html-element-library-panel.types";

export function renderHtmlElementLibraryCommandPreview(
  elements: HtmlElementLibraryPanelElements,
  item: HtmlElementLibraryItem | null,
  eligibility: HtmlInsertionTargetEligibility,
  preview: CommandPreviewResult | null
): void {
  elements.futureAction.disabled = true;
  elements.futureAction.textContent = "Apply unavailable";

  if (!item) {
    elements.patchPreview.replaceChildren(createPreviewLine("Preview: select an element"));
    elements.futureAction.hidden = true;
    return;
  }

  if (!preview) {
    elements.patchPreview.replaceChildren(createPreviewLine(`Preview: locked · ${eligibility.label}`));
    elements.futureAction.hidden = true;
    return;
  }

  const status = createStatusBadge(getPreviewStatusLabel(preview));
  const line = createPreviewLine(`Preview: ${preview.humanSummary}`);
  const children: HTMLElement[] = [status, line];
  const snippet = preview.sourcePatchPreview?.insertedTextPreview.trim();
  if (snippet) children.push(createSnippet(snippet));

  elements.patchPreview.replaceChildren(...children);
  elements.futureAction.hidden = false;
}

function createPreviewLine(text: string): HTMLParagraphElement {
  const line = document.createElement("p");
  line.className = "crystal-html-element-library-panel__preview-line crystal-shell-empty-state crystal-shell-empty-state--compact";
  line.textContent = text;
  line.title = text;
  return line;
}

function createStatusBadge(text: string): HTMLSpanElement {
  const status = document.createElement("span");
  status.className = "crystal-html-element-library-panel__preview-status crystal-shell-status-badge";
  status.textContent = text;
  return status;
}

function createSnippet(text: string): HTMLElement {
  const snippet = document.createElement("code");
  snippet.className = "crystal-html-element-library-panel__preview-snippet";
  snippet.textContent = text.split("\n").slice(0, 3).join("\n");
  return snippet;
}

function getPreviewStatusLabel(preview: CommandPreviewResult): string {
  const reason = preview.errors[0] ?? preview.humanSummary;
  if (preview.status === "preview-ready") return "Ready preview";
  if (reason.toLowerCase().includes("sourcelocation")) return "Missing source location";
  if (preview.status === "unsupported") return "Unsupported";
  return "Blocked";
}
