import type { ProjectDomAttribute, ProjectDomNode, ProjectDomSnapshotIssue, ProjectDomSnapshotState } from "../../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectPreviewState } from "../../../../../../packages/core/project/preview/project-preview.types";
import type { ProjectDomTreePanelElements } from "./project-dom-tree-panel.types";

export function initializeProjectDomTreePanel(): void {
  const panel = document.querySelector<HTMLElement>("[data-project-dom-tree-panel]");
  if (!panel) return;

  const elements = getProjectDomTreePanelElements(panel);
  elements.buildButton.addEventListener("click", () => void runBuildSnapshot(elements));
  elements.clearButton.addEventListener("click", () => void runClearSnapshot(elements));

  window.crystal.project.onDomSnapshotStateChanged((state) => renderDomSnapshotState(elements, state));
  window.crystal.project.onPreviewStateChanged((state) => renderPreviewTarget(elements, state));

  void window.crystal.project.getDomSnapshotState().then((state) => renderDomSnapshotState(elements, state)).catch((error) => renderDomSnapshotError(elements, error));
  void window.crystal.project.getPreviewState().then((state) => renderPreviewTarget(elements, state)).catch(() => undefined);
}

async function runBuildSnapshot(elements: ProjectDomTreePanelElements): Promise<void> {
  setSnapshotBusy(elements, true);
  try {
    const result = await window.crystal.project.buildDomSnapshot();
    renderDomSnapshotState(elements, result.state);
    if (!result.ok && result.issues[0]) renderDomSnapshotError(elements, result.issues[0].message);
  } catch (error) {
    renderDomSnapshotError(elements, error);
  } finally {
    setSnapshotBusy(elements, false);
  }
}

async function runClearSnapshot(elements: ProjectDomTreePanelElements): Promise<void> {
  setSnapshotBusy(elements, true);
  try {
    renderDomSnapshotState(elements, await window.crystal.project.clearDomSnapshot());
  } catch (error) {
    renderDomSnapshotError(elements, error);
  } finally {
    setSnapshotBusy(elements, false);
  }
}

function renderDomSnapshotState(elements: ProjectDomTreePanelElements, state: ProjectDomSnapshotState): void {
  const snapshot = state.currentDomSnapshot;
  elements.status.textContent = state.isStale ? `${state.status} - rebuild recommended` : state.status;
  elements.target.textContent = snapshot?.rootRelativePath ?? "None";
  elements.nodeCount.textContent = snapshot ? String(snapshot.nodeCount) : "0";
  elements.maxDepth.textContent = snapshot ? String(snapshot.maxDepth) : "0";
  elements.issueCount.textContent = String(state.domSnapshotIssueCount);
  elements.error.hidden = !state.lastError;
  elements.error.textContent = state.lastError ?? "";
  elements.clearButton.disabled = !snapshot && state.status === "idle";
  elements.tree.textContent = snapshot ? renderDomNode(snapshot.rootNode) : "No DOM snapshot built.";
  renderSnapshotIssues(elements, state.issues);
}

function renderPreviewTarget(elements: ProjectDomTreePanelElements, state: ProjectPreviewState): void {
  if (elements.target.textContent === "None") elements.target.textContent = state.target?.relativePath ?? "None";
  elements.buildButton.disabled = !state.target;
}

function renderSnapshotIssues(elements: ProjectDomTreePanelElements, issues: readonly ProjectDomSnapshotIssue[]): void {
  elements.issuesEmpty.hidden = issues.length > 0;
  elements.issuesList.replaceChildren(...issues.slice(0, 10).map(createSnapshotIssueItem));
}

function createSnapshotIssueItem(issue: ProjectDomSnapshotIssue): HTMLLIElement {
  const item = document.createElement("li");
  item.className = `crystal-project-dom-tree-panel__issue crystal-project-dom-tree-panel__issue--${issue.severity}`;
  item.append(createIssuePart("code", issue.code), createIssuePart("path", issue.relativePath ?? "preview"), createIssuePart("reason", issue.reason));
  return item;
}

function createIssuePart(name: string, value: string): HTMLSpanElement {
  const part = document.createElement("span");
  part.className = `crystal-project-dom-tree-panel__issue-${name}`;
  part.textContent = value;
  return part;
}

function renderDomNode(node: ProjectDomNode): string {
  const lines: string[] = [];
  appendNodeLine(node, lines);
  return lines.join("\n");
}

function appendNodeLine(node: ProjectDomNode, lines: string[]): void {
  const indent = "  ".repeat(Math.max(0, node.depth));
  lines.push(`${indent}${renderNodeLabel(node)}`);
  for (const child of node.children) appendNodeLine(child, lines);
}

function renderNodeLabel(node: ProjectDomNode): string {
  const suffix = node.truncated ? " …" : "";
  if (node.type === "document") return `#document${suffix}`;
  if (node.type === "doctype") return `<!doctype ${node.textPreview ?? "html"}>${suffix}`;
  if (node.type === "comment") return `<!-- ${node.textPreview ?? ""} -->${suffix}`;
  if (node.type === "text") return `#text \"${node.textPreview ?? ""}\"${suffix}`;
  return `<${node.tagName ?? "element"}${renderAttributes(node.attributes)}>${suffix}`;
}

function renderAttributes(attributes: readonly ProjectDomAttribute[]): string {
  if (attributes.length === 0) return "";
  return ` ${attributes.map(renderAttribute).join(" ")}`;
}

function renderAttribute(attribute: ProjectDomAttribute): string {
  if (attribute.value === null) return attribute.name;
  const suffix = attribute.truncated ? "…" : "";
  return `${attribute.name}=\"${attribute.value}${suffix}\"`;
}

function renderDomSnapshotError(elements: ProjectDomTreePanelElements, error: unknown): void {
  elements.error.hidden = false;
  elements.error.textContent = error instanceof Error ? error.message : String(error);
}

function setSnapshotBusy(elements: ProjectDomTreePanelElements, busy: boolean): void {
  elements.buildButton.disabled = busy;
  elements.clearButton.disabled = busy;
  if (busy) elements.status.textContent = "building";
}

function getProjectDomTreePanelElements(panel: HTMLElement): ProjectDomTreePanelElements {
  return {
    status: queryPanelElement(panel, "[data-project-dom-tree-status]", HTMLElement),
    target: queryPanelElement(panel, "[data-project-dom-tree-target]", HTMLElement),
    nodeCount: queryPanelElement(panel, "[data-project-dom-tree-node-count]", HTMLElement),
    maxDepth: queryPanelElement(panel, "[data-project-dom-tree-max-depth]", HTMLElement),
    issueCount: queryPanelElement(panel, "[data-project-dom-tree-issue-count]", HTMLElement),
    error: queryPanelElement(panel, "[data-project-dom-tree-error]", HTMLElement),
    issuesEmpty: queryPanelElement(panel, "[data-project-dom-tree-issues-empty]", HTMLElement),
    issuesList: queryPanelElement(panel, "[data-project-dom-tree-issues-list]", HTMLUListElement),
    tree: queryPanelElement(panel, "[data-project-dom-tree-output]", HTMLElement),
    buildButton: queryPanelElement(panel, "[data-project-dom-tree-build]", HTMLButtonElement),
    clearButton: queryPanelElement(panel, "[data-project-dom-tree-clear]", HTMLButtonElement)
  };
}

function queryPanelElement<TElement extends HTMLElement>(panel: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = panel.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Project DOM tree panel element: ${selector}`);
  return element;
}
