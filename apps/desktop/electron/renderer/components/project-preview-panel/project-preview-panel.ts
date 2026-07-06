import type { ProjectGraph } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectPreviewIssue, ProjectPreviewLoadResult, ProjectPreviewState } from "../../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectPreviewSelectedNode, ProjectPreviewSelectionState } from "../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import type { ProjectPreviewPanelElements } from "./project-preview-panel.types";
import { createProjectPreviewSelectionMessageBridge, type ProjectPreviewSelectionMessageBridge } from "./selection/project-preview-selection-message-bridge";

let activeProjectPreviewPanelCleanup: (() => void) | null = null;

export function initializeProjectPreviewPanel(): void {
  activeProjectPreviewPanelCleanup?.();

  const panel = document.querySelector<HTMLElement>("[data-project-preview-panel]");
  if (!panel) return;

  const cleanup: Array<() => void> = [];
  const elements = getProjectPreviewPanelElements(panel);
  const selectionBridge = createProjectPreviewSelectionMessageBridge({
    frame: elements.frame,
    onSelectedNode: (selectedNode) => { void setSelectedNodeFromPreview(elements, selectedNode); },
    onInvalidPayload: () => { void reportInvalidSelectedNodePayload(elements); }
  });
  cleanup.push(() => selectionBridge.destroy());

  const handleLoadPreview = () => { void runPreviewNavigationAction(elements, selectionBridge, () => window.crystal.project.loadPreview()); };
  const handleReloadPreview = () => { void runPreviewNavigationAction(elements, selectionBridge, () => window.crystal.project.reloadPreview()); };
  const handleTargetChange = () => { void runPreviewNavigationAction(elements, selectionBridge, () => window.crystal.project.setPreviewTarget(elements.target.value)); };
  const handleToggleSelection = () => { void togglePreviewSelectionMode(elements, selectionBridge); };
  const handleClearSelection = () => { void clearPreviewSelection(elements, selectionBridge); };
  const handleFrameLoad = () => { void syncPreviewSelectionAfterFrameLoad(elements, selectionBridge); };

  elements.loadButton.addEventListener("click", handleLoadPreview);
  elements.reloadButton.addEventListener("click", handleReloadPreview);
  elements.target.addEventListener("change", handleTargetChange);
  elements.selectModeButton.addEventListener("click", handleToggleSelection);
  elements.clearSelectionButton.addEventListener("click", handleClearSelection);
  elements.frame.addEventListener("load", handleFrameLoad);

  cleanup.push(() => elements.loadButton.removeEventListener("click", handleLoadPreview));
  cleanup.push(() => elements.reloadButton.removeEventListener("click", handleReloadPreview));
  cleanup.push(() => elements.target.removeEventListener("change", handleTargetChange));
  cleanup.push(() => elements.selectModeButton.removeEventListener("click", handleToggleSelection));
  cleanup.push(() => elements.clearSelectionButton.removeEventListener("click", handleClearSelection));
  cleanup.push(() => elements.frame.removeEventListener("load", handleFrameLoad));

  cleanup.push(window.crystal.project.onPreviewStateChanged((state) => renderPreviewState(elements, state)));
  cleanup.push(window.crystal.project.onPreviewSelectionStateChanged((state) => renderPreviewSelectionState(elements, state)));
  cleanup.push(window.crystal.project.onWatcherStateChanged(() => { void refreshPreviewTargets(elements); }));

  activeProjectPreviewPanelCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeProjectPreviewPanelCleanup = null;
  };

  void window.crystal.project.getPreviewState().then((state) => renderPreviewState(elements, state)).catch((error) => renderPreviewError(elements, error));
  void window.crystal.project.getPreviewSelectionState().then((state) => renderPreviewSelectionState(elements, state)).catch((error) => renderPreviewError(elements, error));
  void refreshPreviewTargets(elements);
}

async function runPreviewNavigationAction(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge, action: () => Promise<ProjectPreviewLoadResult>): Promise<void> {
  await clearPreviewSelection(elements, selectionBridge);
  await runPreviewAction(elements, action);
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

async function togglePreviewSelectionMode(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge): Promise<void> {
  try {
    const current = await window.crystal.project.getPreviewSelectionState();
    if (current.enabled) {
      selectionBridge.disable();
      renderPreviewSelectionState(elements, await window.crystal.project.disablePreviewSelection());
      return;
    }

    renderPreviewSelectionState(elements, await window.crystal.project.enablePreviewSelection());
    selectionBridge.enable();
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

async function clearPreviewSelection(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge): Promise<void> {
  try {
    selectionBridge.clear();
    renderPreviewSelectionState(elements, await window.crystal.project.clearPreviewSelection());
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

async function syncPreviewSelectionAfterFrameLoad(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge): Promise<void> {
  try {
    const state = await window.crystal.project.clearPreviewSelection();
    renderPreviewSelectionState(elements, state);
    selectionBridge.clear();
    if (state.enabled) selectionBridge.enable();
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

async function setSelectedNodeFromPreview(elements: ProjectPreviewPanelElements, selectedNode: ProjectPreviewSelectedNode): Promise<void> {
  try {
    renderPreviewSelectionState(elements, await window.crystal.project.setPreviewSelectedNode(selectedNode));
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

async function reportInvalidSelectedNodePayload(elements: ProjectPreviewPanelElements): Promise<void> {
  try {
    renderPreviewSelectionState(elements, await window.crystal.project.setPreviewSelectedNode({}));
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

function renderPreviewState(elements: ProjectPreviewPanelElements, state: ProjectPreviewState): void {
  elements.status.textContent = renderPreviewStatus(state);
  elements.page.textContent = state.target?.relativePath ?? "None";
  elements.lastLoad.textContent = state.lastLoadedAt ? formatTimestamp(state.lastLoadedAt) : "none";
  elements.lastReload.textContent = state.lastReloadedAt ? formatTimestamp(state.lastReloadedAt) : "none";
  elements.reason.textContent = state.lastReloadReason ?? "none";
  elements.issueCount.textContent = String(state.issueCount);
  elements.lastIssue.textContent = state.lastIssueAt ? formatTimestamp(state.lastIssueAt) : "none";
  elements.error.hidden = !state.lastError;
  elements.error.textContent = state.lastError ?? "";
  elements.reloadButton.disabled = !state.target;
  renderPreviewIssues(elements, state.issues);

  if (state.target && elements.target.value !== state.target.relativePath) elements.target.value = state.target.relativePath;
  if (state.previewUrl && state.status === "ready") elements.frame.src = state.previewUrl;
}

function renderPreviewSelectionState(elements: ProjectPreviewPanelElements, state: ProjectPreviewSelectionState): void {
  elements.selectionMode.textContent = state.mode;
  elements.selectModeButton.textContent = state.enabled ? "Disable Selection" : "Select Mode";
  elements.selectModeButton.setAttribute("aria-pressed", String(state.enabled));
  elements.clearSelectionButton.disabled = !state.enabled && !state.selectedNode;

  elements.selectedTag.textContent = state.selectedNode?.tagName ?? "none";
  elements.selectedPath.textContent = state.selectedNode?.snapshotPath ?? "none";
  elements.selectionMappingStatus.textContent = state.mappingStatus;
  elements.mappedSnapshotPath.textContent = state.mappedSnapshotPath ?? "none";
  elements.selectionMappingReason.textContent = state.mappingReason ?? "none";
  elements.selectedSelector.textContent = state.selectedNode?.selectorPreview || "none";
  elements.selectedAttributes.textContent = state.selectedNode ? renderAttributesPreview(state.selectedNode) : "none";
  elements.selectedText.textContent = state.selectedNode?.textPreview || "none";

  elements.selectionIssue.hidden = !state.lastIssue;
  elements.selectionIssue.textContent = state.lastIssue ? `${state.lastIssue.code}: ${state.lastIssue.message}` : "";
}

function renderAttributesPreview(selectedNode: ProjectPreviewSelectedNode): string {
  if (selectedNode.attributesPreview.length === 0) return "none";
  return selectedNode.attributesPreview.map((attribute) => attribute.value === null ? attribute.name : `${attribute.name}="${attribute.value}"`).join(" ");
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

function renderPreviewIssues(elements: ProjectPreviewPanelElements, issues: readonly ProjectPreviewIssue[]): void {
  elements.issuesEmpty.hidden = issues.length > 0;
  elements.issuesList.replaceChildren(...issues.slice(0, 10).map(createPreviewIssueItem));
}

function createPreviewIssueItem(issue: ProjectPreviewIssue): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `crystal-project-preview-panel__issue crystal-project-preview-panel__issue--${issue.severity}`;
  item.append(createIssuePart("type", issue.type), createIssuePart("path", getIssueDisplayPath(issue)), createIssuePart("reason", issue.reason), createIssuePart("count", issue.count > 1 ? `x${issue.count}` : ""));
  return item;
}

function createIssuePart(name: string, value: string): HTMLSpanElement {
  const part = document.createElement("span");
  part.className = `crystal-project-preview-panel__issue-${name}`;
  part.textContent = value;
  return part;
}

function getIssueDisplayPath(issue: ProjectPreviewIssue): string {
  return issue.relativePath ?? issue.path ?? issue.requestUrl ?? "preview";
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
    issueCount: queryPanelElement(panel, "[data-project-preview-issue-count]", HTMLElement),
    lastIssue: queryPanelElement(panel, "[data-project-preview-last-issue]", HTMLElement),
    error: queryPanelElement(panel, "[data-project-preview-error]", HTMLElement),
    selectionMode: queryPanelElement(panel, "[data-project-preview-selection-mode]", HTMLElement),
    selectedTag: queryPanelElement(panel, "[data-project-preview-selected-tag]", HTMLElement),
    selectedPath: queryPanelElement(panel, "[data-project-preview-selected-path]", HTMLElement),
    selectionMappingStatus: queryPanelElement(panel, "[data-project-preview-selection-mapping-status]", HTMLElement),
    mappedSnapshotPath: queryPanelElement(panel, "[data-project-preview-mapped-snapshot-path]", HTMLElement),
    selectionMappingReason: queryPanelElement(panel, "[data-project-preview-selection-mapping-reason]", HTMLElement),
    selectedSelector: queryPanelElement(panel, "[data-project-preview-selected-selector]", HTMLElement),
    selectedAttributes: queryPanelElement(panel, "[data-project-preview-selected-attributes]", HTMLElement),
    selectedText: queryPanelElement(panel, "[data-project-preview-selected-text]", HTMLElement),
    selectionIssue: queryPanelElement(panel, "[data-project-preview-selection-issue]", HTMLElement),
    issuesEmpty: queryPanelElement(panel, "[data-project-preview-issues-empty]", HTMLElement),
    issuesList: queryPanelElement(panel, "[data-project-preview-issues-list]", HTMLUListElement),
    frame: queryPanelElement(panel, "[data-project-preview-frame]", HTMLIFrameElement),
    loadButton: queryPanelElement(panel, "[data-project-preview-load]", HTMLButtonElement),
    reloadButton: queryPanelElement(panel, "[data-project-preview-reload]", HTMLButtonElement),
    selectModeButton: queryPanelElement(panel, "[data-project-preview-select-mode]", HTMLButtonElement),
    clearSelectionButton: queryPanelElement(panel, "[data-project-preview-clear-selection]", HTMLButtonElement)
  };
}

function queryPanelElement<TElement extends Element>(root: HTMLElement, selector: string, constructor: { new(): TElement }): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof constructor)) throw new Error(`Missing Project Preview panel element: ${selector}`);
  return element;
}

function renderPreviewStatus(state: ProjectPreviewState): string {
  if (state.status === "ready" && !state.isSyncedWithProjectGraph) return "ready - graph stale";
  return state.status;
}

function formatTimestamp(value: number): string {
  return new Date(value).toLocaleTimeString();
}
