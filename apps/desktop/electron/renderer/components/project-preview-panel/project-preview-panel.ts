import type { ProjectGraph } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectPreviewLoadResult, ProjectPreviewState } from "../../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectPreviewPanelElements } from "./project-preview-panel.types";

export function initializeProjectPreviewPanel(): void {
  const panel = document.querySelector<HTMLElement>("[data-project-preview-panel]");
  if (!panel) return;

  const elements = getProjectPreviewPanelElements(panel);
  elements.loadButton.addEventListener("click", () => void runPreviewAction(elements, () => window.crystal.project.loadPreview()));
  elements.reloadButton.addEventListener("click", () => void runPreviewAction(elements, () => window.crystal.project.reloadPreview()));
  elements.target.addEventListener("change", () => void runPreviewAction(elements, () => window.crystal.project.setPreviewTarget(elements.target.value)));

  window.crystal.project.onPreviewStateChanged((state) => renderPreviewState(elements, state));
  window.crystal.project.onWatcherStateChanged(() => { void refreshPreviewTargets(elements); });

  void window.crystal.project.getPreviewState().then((state) => renderPreviewState(elements, state)).catch((error) => renderPreviewError(elements, error));
  void refreshPreviewTargets(elements);
}

async function runPreviewAction(elements: ProjectPreviewPanelElements, action: () => Promise<ProjectPreviewLoadResult>): Promise<void> {
  setPreviewBusy(elements, true);
  try {
    const result = await action();
    renderPreviewState(elements, result.state);
    await refreshPreviewTargets(elements);
    if (!result.ok && result.issue) renderPreviewError(elements, result.issue.message);
  } catch (error) {
    renderPreviewError(elements, error);
  } finally {
    setPreviewBusy(elements, false);
  }
}

async function refreshPreviewTargets(elements: ProjectPreviewPanelElements): Promise<void> {
  try {
    renderTargetOptions(elements, await window.crystal.project.getGraph());
  } catch {
    renderTargetOptions(elements, null);
  }
}

function renderPreviewState(elements: ProjectPreviewPanelElements, state: ProjectPreviewState): void {
  elements.status.textContent = state.status;
  elements.page.textContent = state.target?.relativePath ?? "None";
  elements.lastLoad.textContent = state.lastLoadedAt ? formatTimestamp(state.lastLoadedAt) : "none";
  elements.lastReload.textContent = state.lastReloadedAt ? formatTimestamp(state.lastReloadedAt) : "none";
  elements.reason.textContent = state.lastReloadReason ?? "none";
  elements.error.hidden = !state.lastError;
  elements.error.textContent = state.lastError ?? "";
  elements.reloadButton.disabled = !state.target;

  if (state.target && elements.target.value !== state.target.relativePath) elements.target.value = state.target.relativePath;
  if (state.previewUrl && state.status === "ready") elements.frame.src = state.previewUrl;
}

function renderTargetOptions(elements: ProjectPreviewPanelElements, graph: ProjectGraph | null): void {
  const selected = elements.target.value;
  elements.target.textContent = "";
  const pages = graph?.pages ?? [];
  if (pages.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No HTML pages detected";
    elements.target.append(option);
    elements.target.disabled = true;
    return;
  }

  elements.target.disabled = false;
  for (const page of pages) {
    const option = document.createElement("option");
    option.value = page.relativePath;
    option.textContent = `${page.displayName}${page.isEntrypoint ? " - entry" : ""}`;
    elements.target.append(option);
  }
  if (selected && pages.some((page) => page.relativePath === selected)) elements.target.value = selected;
}

function renderPreviewError(elements: ProjectPreviewPanelElements, error: unknown): void {
  elements.error.hidden = false;
  elements.error.textContent = error instanceof Error ? error.message : String(error);
}

function setPreviewBusy(elements: ProjectPreviewPanelElements, busy: boolean): void {
  elements.loadButton.disabled = busy;
  elements.reloadButton.disabled = busy;
  elements.status.textContent = busy ? "loading" : elements.status.textContent;
}

function getProjectPreviewPanelElements(panel: HTMLElement): ProjectPreviewPanelElements {
  return {
    status: queryPanelElement(panel, "[data-project-preview-status]", HTMLElement),
    target: queryPanelElement(panel, "[data-project-preview-target]", HTMLSelectElement),
    page: queryPanelElement(panel, "[data-project-preview-page]", HTMLElement),
    lastLoad: queryPanelElement(panel, "[data-project-preview-last-load]", HTMLElement),
    lastReload: queryPanelElement(panel, "[data-project-preview-last-reload]", HTMLElement),
    reason: queryPanelElement(panel, "[data-project-preview-reason]", HTMLElement),
    error: queryPanelElement(panel, "[data-project-preview-error]", HTMLElement),
    frame: queryPanelElement(panel, "[data-project-preview-frame]", HTMLIFrameElement),
    loadButton: queryPanelElement(panel, "[data-project-preview-load]", HTMLButtonElement),
    reloadButton: queryPanelElement(panel, "[data-project-preview-reload]", HTMLButtonElement)
  };
}

function queryPanelElement<TElement extends HTMLElement>(panel: HTMLElement, selector: string, constructor: new () => TElement): TElement {
  const element = panel.querySelector(selector);
  if (!(element instanceof constructor)) throw new Error(`Missing Project Preview panel element: ${selector}`);
  return element;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
