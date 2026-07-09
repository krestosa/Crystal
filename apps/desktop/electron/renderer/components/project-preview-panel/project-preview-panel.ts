import type { ProjectDomSnapshotState } from "../../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectGraph } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectPreviewIssue, ProjectPreviewLoadResult, ProjectPreviewState } from "../../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectPreviewSelectedNode, ProjectPreviewSelectionState } from "../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import { renderProjectPreviewInspector } from "./inspector/project-preview-inspector-renderer";
import type { ProjectPreviewPanelElements } from "./project-preview-panel.types";
import { createProjectPreviewSelectionMessageBridge, type ProjectPreviewSelectionMessageBridge } from "./selection/project-preview-selection-message-bridge";

let activeProjectPreviewPanelCleanup: (() => void) | null = null;

export function initializeProjectPreviewPanel(): void {
  activeProjectPreviewPanelCleanup?.();

  const panel = document.querySelector<HTMLElement>("[data-project-preview-panel]");
  if (!panel) return;

  const cleanup: Array<() => void> = [];
  const elements = getProjectPreviewPanelElements(panel);
  let latestPreviewState: ProjectPreviewState | null = null;
  let latestDomSnapshotState: ProjectDomSnapshotState | null = null;
  let latestPreviewSelectionState: ProjectPreviewSelectionState | null = null;
  const renderInspectorFromLatestState = () => {
    if (!latestPreviewState || !latestDomSnapshotState || !latestPreviewSelectionState) return;
    renderProjectPreviewInspector(elements, { preview: latestPreviewState, domSnapshot: latestDomSnapshotState, previewSelection: latestPreviewSelectionState });
  };
  const renderPreviewAndInspector = (state: ProjectPreviewState) => {
    latestPreviewState = state;
    renderPreviewState(elements, state);
    renderInspectorFromLatestState();
  };
  const renderDomSnapshotAndInspector = (state: ProjectDomSnapshotState) => {
    latestDomSnapshotState = state;
    renderInspectorFromLatestState();
  };
  const renderSelectionAndInspector = (state: ProjectPreviewSelectionState) => {
    latestPreviewSelectionState = state;
    renderPreviewSelectionState(elements, state);
    renderInspectorFromLatestState();
  };
  const selectionBridge = createProjectPreviewSelectionMessageBridge({
    frame: elements.frame,
    onSelectedNode: (selectedNode) => { void setSelectedNodeFromPreview(elements, selectedNode, renderSelectionAndInspector); },
    onInvalidPayload: () => { void reportInvalidSelectedNodePayload(elements, renderSelectionAndInspector); }
  });
  cleanup.push(() => selectionBridge.destroy());

  const handleLoadPreview = () => { void runPreviewNavigationAction(elements, selectionBridge, renderPreviewAndInspector, renderSelectionAndInspector, () => window.crystal.project.loadPreview()); };
  const handleReloadPreview = () => { void runPreviewNavigationAction(elements, selectionBridge, renderPreviewAndInspector, renderSelectionAndInspector, () => window.crystal.project.reloadPreview()); };
  const handleTargetChange = () => { void runPreviewNavigationAction(elements, selectionBridge, renderPreviewAndInspector, renderSelectionAndInspector, () => window.crystal.project.setPreviewTarget(elements.target.value)); };
  const handleToggleSelection = () => { void togglePreviewSelectionMode(elements, selectionBridge, renderSelectionAndInspector); };
  const handleClearSelection = () => { void clearPreviewSelection(elements, selectionBridge, renderSelectionAndInspector); };
  const handleFrameLoad = () => { void syncPreviewSelectionAfterFrameLoad(elements, selectionBridge, renderSelectionAndInspector); };

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

  cleanup.push(window.crystal.project.onPreviewStateChanged(renderPreviewAndInspector));
  cleanup.push(window.crystal.project.onDomSnapshotStateChanged(renderDomSnapshotAndInspector));
  cleanup.push(window.crystal.project.onPreviewSelectionStateChanged(renderSelectionAndInspector));
  cleanup.push(window.crystal.project.onWatcherStateChanged(() => { void refreshPreviewTargets(elements); }));

  activeProjectPreviewPanelCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeProjectPreviewPanelCleanup = null;
  };

  void window.crystal.project.getPreviewState().then(renderPreviewAndInspector).catch((error) => renderPreviewError(elements, error));
  void window.crystal.project.getDomSnapshotState().then(renderDomSnapshotAndInspector).catch((error) => renderPreviewError(elements, error));
  void window.crystal.project.getPreviewSelectionState().then(renderSelectionAndInspector).catch((error) => renderPreviewError(elements, error));
  void refreshPreviewTargets(elements);
}

async function runPreviewNavigationAction(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge, renderPreviewAndInspector: (state: ProjectPreviewState) => void, renderSelectionAndInspector: (state: ProjectPreviewSelectionState) => void, action: () => Promise<ProjectPreviewLoadResult>): Promise<void> {
  await clearPreviewSelection(elements, selectionBridge, renderSelectionAndInspector);
  await runPreviewAction(elements, renderPreviewAndInspector, action);
}

async function runPreviewAction(elements: ProjectPreviewPanelElements, renderPreviewAndInspector: (state: ProjectPreviewState) => void, action: () => Promise<ProjectPreviewLoadResult>): Promise<void> {
  setPreviewBusy(elements, true);
  clearPreviewTransientState(elements);
  try {
    const result = await action();
    renderPreviewAndInspector(result.state);
    await refreshPreviewTargets(elements);
    if (!result.ok && result.issue) renderPreviewError(elements, result.issue.message);
  } catch (error) {
    renderPreviewError(elements, error);
  } finally {
    setPreviewBusy(elements, false);
  }
}

async function refreshPreviewTargets(elements: ProjectPreviewPanelElements): Promise<void> {
  try { renderTargetOptions(elements, await window.crystal.project.getGraph()); }
  catch { renderTargetOptions(elements, null); }
}

async function togglePreviewSelectionMode(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge, renderSelectionAndInspector: (state: ProjectPreviewSelectionState) => void): Promise<void> {
  try {
    const current = await window.crystal.project.getPreviewSelectionState();
    if (current.enabled) {
      selectionBridge.disable();
      renderSelectionAndInspector(await window.crystal.project.disablePreviewSelection());
      return;
    }
    renderSelectionAndInspector(await window.crystal.project.enablePreviewSelection());
    selectionBridge.enable();
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

async function clearPreviewSelection(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge, renderSelectionAndInspector: (state: ProjectPreviewSelectionState) => void): Promise<void> {
  try {
    selectionBridge.clear();
    renderSelectionAndInspector(await window.crystal.project.clearPreviewSelection());
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

async function syncPreviewSelectionAfterFrameLoad(elements: ProjectPreviewPanelElements, selectionBridge: ProjectPreviewSelectionMessageBridge, renderSelectionAndInspector: (state: ProjectPreviewSelectionState) => void): Promise<void> {
  try {
    const state = await window.crystal.project.clearPreviewSelection();
    renderSelectionAndInspector(state);
    selectionBridge.clear();
    if (state.enabled) selectionBridge.enable();
  } catch (error) {
    renderPreviewError(elements, error);
  }
}

async function setSelectedNodeFromPreview(elements: ProjectPreviewPanelElements, selectedNode: ProjectPreviewSelectedNode, renderSelectionAndInspector: (state: ProjectPreviewSelectionState) => void): Promise<void> {
  try { renderSelectionAndInspector(await window.crystal.project.setPreviewSelectedNode(selectedNode)); }
  catch (error) { renderPreviewError(elements, error); }
}

async function reportInvalidSelectedNodePayload(elements: ProjectPreviewPanelElements, renderSelectionAndInspector: (state: ProjectPreviewSelectionState) => void): Promise<void> {
  try { renderSelectionAndInspector(await window.crystal.project.setPreviewSelectedNode({})); }
  catch (error) { renderPreviewError(elements, error); }
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
  elements.selectionMode.textContent = renderSelectionMode(state);
  elements.selectModeButton.textContent = state.enabled ? "Disable" : "Select";
  elements.selectModeButton.setAttribute("aria-pressed", String(state.enabled));
  elements.clearSelectionButton.disabled = !state.enabled && !state.selectedNode;
  elements.selectedTag.textContent = state.selectedNode?.tagName ?? "none";
  elements.selectedPath.textContent = state.selectedNode?.snapshotPath ?? "none";
  elements.selectionMappingStatus.textContent = renderMappingStatus(state.mappingStatus);
  elements.mappedSnapshotPath.textContent = state.mappedSnapshotPath ?? "none";
  elements.selectionMappingReason.textContent = renderMappingReason(state.mappingReason);
  elements.selectedSelector.textContent = state.selectedNode?.selectorPreview || "none";
  elements.selectedAttributes.textContent = state.selectedNode ? renderAttributesPreview(state.selectedNode) : "none";
  elements.selectedText.textContent = state.selectedNode?.textPreview || "none";
  elements.selectionIssue.hidden = !state.lastIssue;
  elements.selectionIssue.textContent = state.lastIssue ? `${state.lastIssue.code}: ${state.lastIssue.message}` : "";
}

function renderSelectionMode(state: ProjectPreviewSelectionState): string {
  if (state.selectedNode) return state.enabled ? "selecting · node" : "node selected";
  if (state.enabled) return "selecting";
  return "No selection.";
}

function renderMappingStatus(status: ProjectPreviewSelectionState["mappingStatus"]): string {
  if (status === "missing-snapshot") return "missing snapshot";
  if (status === "stale") return "stale snapshot";
  if (status === "ambiguous") return "ambiguous";
  if (status === "mismatched") return "mismatch";
  return status;
}

function renderMappingReason(reason: string | null): string {
  if (!reason) return "none";
  if (reason === "missing snapshot") return "Build DOM Snapshot first.";
  if (reason === "snapshot stale") return "Rebuild DOM Snapshot.";
  if (reason === "ambiguous fallback") return "Multiple DOM Snapshot candidates.";
  if (reason === "path not found") return "Selected path not found.";
  if (reason === "tag mismatch") return "Tag mismatch.";
  return reason;
}

function renderAttributesPreview(selectedNode: ProjectPreviewSelectedNode): string {
  if (selectedNode.attributesPreview.length === 0) return "none";
  return selectedNode.attributesPreview.map((attribute) => attribute.value === null ? attribute.name : `${attribute.name}=\"${attribute.value}\"`).join(" ");
}

function renderTargetOptions(elements: ProjectPreviewPanelElements, graph: ProjectGraph | null): void {
  const selected = elements.target.value;
  elements.target.textContent = "";
  const pages = graph?.pages ?? [];
  if (pages.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No HTML pages";
    elements.target.append(option);
    elements.target.disabled = true;
    return;
  }
  elements.target.disabled = false;
  for (const page of pages) {
    const option = document.createElement("option");
    option.value = page.relativePath;
    option.textContent = `${page.displayName}${page.isEntrypoint ? " · entry" : ""}`;
    elements.target.append(option);
  }
  if (selected && pages.some((page) => page.relativePath === selected)) elements.target.value = selected;
}

function renderPreviewIssues(elements: ProjectPreviewPanelElements, issues: readonly ProjectPreviewIssue[]): void {
  elements.issuesEmpty.hidden = issues.length > 0;
  elements.issuesList.replaceChildren(...issues.slice(0, 8).map(createPreviewIssueItem));
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

function clearPreviewTransientState(elements: ProjectPreviewPanelElements): void {
  elements.frame.src = "about:blank";
  elements.error.hidden = true;
  elements.error.textContent = "";
  elements.issueCount.textContent = "0";
  elements.lastIssue.textContent = "none";
  renderPreviewIssues(elements, []);
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
  const query = <TElement extends HTMLElement>(selector: string, elementType: new () => TElement) => queryProjectPreviewElement(panel, selector, elementType);
  return {
    status: query("[data-project-preview-status]", HTMLElement),
    target: query("[data-project-preview-target]", HTMLSelectElement),
    page: query("[data-project-preview-page]", HTMLElement),
    lastLoad: query("[data-project-preview-last-load]", HTMLElement),
    lastReload: query("[data-project-preview-last-reload]", HTMLElement),
    reason: query("[data-project-preview-reason]", HTMLElement),
    issueCount: query("[data-project-preview-issue-count]", HTMLElement),
    lastIssue: query("[data-project-preview-last-issue]", HTMLElement),
    error: query("[data-project-preview-error]", HTMLElement),
    selectionMode: query("[data-project-preview-selection-mode]", HTMLElement),
    selectedTag: query("[data-project-preview-selected-tag]", HTMLElement),
    selectedPath: query("[data-project-preview-selected-path]", HTMLElement),
    selectionMappingStatus: query("[data-project-preview-selection-mapping-status]", HTMLElement),
    mappedSnapshotPath: query("[data-project-preview-mapped-snapshot-path]", HTMLElement),
    selectionMappingReason: query("[data-project-preview-selection-mapping-reason]", HTMLElement),
    selectedSelector: query("[data-project-preview-selected-selector]", HTMLElement),
    selectedAttributes: query("[data-project-preview-selected-attributes]", HTMLElement),
    selectedText: query("[data-project-preview-selected-text]", HTMLElement),
    selectionIssue: query("[data-project-preview-selection-issue]", HTMLElement),
    inspectorStatus: query("[data-project-preview-inspector-status]", HTMLElement),
    inspectorMessage: query("[data-project-preview-inspector-message]", HTMLElement),
    inspectorSelectedDetails: query("[data-project-preview-inspector-selected-details]", HTMLDListElement),
    inspectorSnapshotDetails: query("[data-project-preview-inspector-snapshot-details]", HTMLDListElement),
    inspectorSnapshotEmpty: query("[data-project-preview-inspector-snapshot-empty]", HTMLElement),
    editableInspectorStatus: query("[data-editable-inspector-status]", HTMLElement),
    editableInspectorMessage: query("[data-editable-inspector-message]", HTMLElement),
    editableInspectorReadiness: query("[data-editable-inspector-readiness]", HTMLDListElement),
    editableInspectorFields: query("[data-editable-inspector-fields]", HTMLElement),
    editableInspectorFieldsEmpty: query("[data-editable-inspector-fields-empty]", HTMLElement),
    editableInspectorIntents: query("[data-editable-inspector-intents]", HTMLUListElement),
    editableInspectorIntentsEmpty: query("[data-editable-inspector-intents-empty]", HTMLElement),
    editableInspectorApplyUnavailableAffordance: query("[data-editable-inspector-apply]", HTMLElement),
    issuesEmpty: query("[data-project-preview-issues-empty]", HTMLElement),
    issuesList: query("[data-project-preview-issues-list]", HTMLUListElement),
    frame: query("[data-project-preview-frame]", HTMLIFrameElement),
    loadButton: query("[data-project-preview-load]", HTMLButtonElement),
    reloadButton: query("[data-project-preview-reload]", HTMLButtonElement),
    selectModeButton: query("[data-project-preview-select-mode]", HTMLButtonElement),
    clearSelectionButton: query("[data-project-preview-clear-selection]", HTMLButtonElement)
  };
}

function queryProjectPreviewElement<TElement extends HTMLElement>(panel: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = panel.querySelector(selector) ?? document.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Project Preview element: ${selector}`);
  return element;
}

function renderPreviewStatus(state: ProjectPreviewState): string {
  if (state.status === "ready" && state.issueCount > 0) return "ready · issues";
  if (state.status === "ready" && state.isSyncedWithProjectGraph) return "ready";
  if (state.status === "ready") return "ready · graph pending";
  if (state.status === "idle") return "idle";
  if (state.status === "loading") return "loading";
  if (state.status === "failed") return "failed";
  return state.status;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}
