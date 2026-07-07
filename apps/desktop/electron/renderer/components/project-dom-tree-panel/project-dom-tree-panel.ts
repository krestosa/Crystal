import type { ProjectDomAttribute, ProjectDomNode, ProjectDomSnapshot, ProjectDomSnapshotIssue, ProjectDomSnapshotState } from "../../../../../../packages/core/project/dom/project-dom-snapshot.types";
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
  elements.status.textContent = state.isStale ? `${state.status} · stale` : renderSnapshotStatus(state.status);
  elements.target.textContent = snapshot?.rootRelativePath ?? "None";
  elements.nodeCount.textContent = snapshot ? String(snapshot.nodeCount) : "0";
  elements.maxDepth.textContent = snapshot ? String(snapshot.maxDepth) : "0";
  elements.issueCount.textContent = String(state.domSnapshotIssueCount);
  elements.error.hidden = !state.lastError;
  elements.error.textContent = state.lastError ?? "";
  elements.clearButton.disabled = !snapshot && state.status === "idle";
  elements.tree.textContent = snapshot ? renderDomSnapshot(snapshot) : "No DOM snapshot built.";
  renderSnapshotIssues(elements, state.issues);
}

function renderSnapshotStatus(status: ProjectDomSnapshotState["status"]): string {
  if (status === "idle") return "idle";
  if (status === "building") return "building";
  if (status === "ready") return "ready";
  if (status === "failed") return "failed";
  return status;
}

function renderPreviewTarget(elements: ProjectDomTreePanelElements, state: ProjectPreviewState): void {
  if (elements.target.textContent === "None") elements.target.textContent = state.target?.relativePath ?? "None";
  elements.buildButton.disabled = !state.target;
}

function renderSnapshotIssues(elements: ProjectDomTreePanelElements, issues: readonly ProjectDomSnapshotIssue[]): void {
  elements.issuesEmpty.hidden = issues.length > 0;
  elements.issuesList.replaceChildren(...issues.slice(0, 8).map(createSnapshotIssueItem));
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

function renderDomSnapshot(snapshot: ProjectDomSnapshot): string {
  const lines: string[] = [];
  appendNodeLine(snapshot.rootNode, lines);
  lines.push("");
  lines.push(snapshot.isTruncated ? `#snapshot truncated — ${snapshot.nodeCount} nodes shown` : `#snapshot complete — ${snapshot.nodeCount} nodes`);
  return lines.join("\n");
}

function appendNodeLine(node: ProjectDomNode, lines: string[]): void {
  const indent = "  ".repeat(Math.max(0, node.depth));
  lines.push(`${indent}${renderNodeLabel(node)} ${renderNodeMetadata(node)}`);
  if (node.truncated) lines.push(`${indent}  … truncated`);
  for (const child of node.children) appendNodeLine(child, lines);
}

function renderNodeMetadata(node: ProjectDomNode): string {
  return `[${node.snapshotPath}]`;
}

function renderNodeLabel(node: ProjectDomNode): string {
  if (node.type === "document") return "#document";
  if (node.type === "doctype") return `<!doctype ${node.textPreview ?? "html"}>`;
  if (node.type === "comment") return `<!-- ${node.textPreview ?? ""} -->`;
  if (node.type === "text") return `#text \"${node.textPreview ?? ""}\"`;
  return `<${node.tagName ?? "element"}${renderAttributes(node.attributes)}>`;
}

function renderAttributes(attributes: readonly ProjectDomAttribute[]): string {
  if (attributes.length === 0) return "";
  return ` ${attributes.map(renderAttribute).join(" ")}`;
}

function renderAttribute(attribute: ProjectDomAttribute): string {
  if (attribute.value === null) return attribute.name;
  return `${attribute.name}=\"${attribute.value}\"`;
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
  const query = <TElement extends HTMLElement>(selector: string, elementType: new () => TElement) => queryDomTreeElement(panel, selector, elementType);
  return {
    status: query("[data-project-dom-tree-status]", HTMLElement),
    target: query("[data-project-dom-tree-target]", HTMLElement),
    nodeCount: query("[data-project-dom-tree-node-count]", HTMLElement),
    maxDepth: query("[data-project-dom-tree-max-depth]", HTMLElement),
    issueCount: query("[data-project-dom-tree-issue-count]", HTMLElement),
    error: query("[data-project-dom-tree-error]", HTMLElement),
    issuesEmpty: query("[data-project-dom-tree-issues-empty]", HTMLElement),
    issuesList: query("[data-project-dom-tree-issues-list]", HTMLUListElement),
    tree: query("[data-project-dom-tree-output]", HTMLElement),
    buildButton: query("[data-project-dom-tree-build]", HTMLButtonElement),
    clearButton: query("[data-project-dom-tree-clear]", HTMLButtonElement)
  };
}

function queryDomTreeElement<TElement extends HTMLElement>(panel: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = panel.querySelector(selector) ?? document.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Project DOM tree element: ${selector}`);
  return element;
}
