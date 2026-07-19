import { filterRepositoryGraphView, type RepositoryGraphViewEdge, type RepositoryGraphViewNode } from "../../../../../../packages/core/project/repository-graph-view";
import { getRepositoryGraphNode } from "./repository-graph-view.state";
import { resolveRepositoryGraphNode, type RepositoryGraphViewElements, type RepositoryGraphViewState } from "./repository-graph-view.types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function getRepositoryGraphViewElements(root: HTMLElement): RepositoryGraphViewElements {
  return {
    root,
    surface: queryElement(root, "[data-repository-graph-surface]", HTMLElement),
    stage: queryElement(root, "[data-repository-graph-stage]", HTMLElement),
    edgeLayer: queryElement(root, "[data-repository-graph-edges]", SVGSVGElement),
    nodeLayer: queryElement(root, "[data-repository-graph-nodes]", HTMLElement),
    status: queryElement(root, "[data-repository-graph-status]", HTMLElement),
    summary: queryElement(root, "[data-repository-graph-summary]", HTMLElement),
    searchInput: queryElement(root, "[data-repository-graph-search]", HTMLInputElement),
    kindSelect: queryElement(root, "[data-repository-graph-kind]", HTMLSelectElement),
    hideIsolatedInput: queryElement(root, "[data-repository-graph-hide-isolated]", HTMLInputElement),
    edgeModeSelect: queryElement(root, "[data-repository-graph-edge-mode]", HTMLSelectElement),
    fitButton: queryElement(root, "[data-repository-graph-fit]", HTMLButtonElement),
    resetButton: queryElement(root, "[data-repository-graph-reset]", HTMLButtonElement),
    centerButton: queryElement(root, "[data-repository-graph-center-selection]", HTMLButtonElement),
    zoomDisplay: queryElement(root, "[data-repository-graph-zoom]", HTMLElement),
    detailPanel: queryElement(root, "[data-repository-graph-detail]", HTMLElement)
  };
}

export function renderRepositoryGraphView(elements: RepositoryGraphViewElements, state: RepositoryGraphViewState): void {
  elements.stage.style.transform = `translate(${state.viewport.panX}px, ${state.viewport.panY}px) scale(${state.viewport.zoom})`;
  elements.zoomDisplay.textContent = `${Math.round(state.viewport.zoom * 100)}%`;
  elements.centerButton.disabled = state.selectedNodeId === null;

  if (!state.model) {
    renderStatus(elements, "No project open", "Open a project from Design View to build the repository graph.");
    elements.summary.textContent = "0 nodes · 0 edges";
    elements.nodeLayer.replaceChildren();
    clearSvgEdges(elements.edgeLayer);
    renderEmptyDetail(elements.detailPanel);
    synchronizeKindOptions(elements.kindSelect, []);
    return;
  }

  synchronizeKindOptions(elements.kindSelect, state.model.kinds);
  const filtered = filterRepositoryGraphView(state.model, {
    query: state.query,
    kind: state.kind,
    hideIsolated: state.hideIsolated,
    edgeMode: state.edgeMode,
    selectedNodeId: state.selectedNodeId
  });
  const nodes = filtered.nodes.map((node) => resolveRepositoryGraphNode(state, node));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = filtered.edges.filter((edge) => nodeById.has(edge.fromNodeId) && nodeById.has(edge.toNodeId));

  elements.summary.textContent = `${nodes.length} nodes · ${edges.length} edges`;
  if (state.model.nodes.length === 0) renderStatus(elements, "Empty project", "No files are available in the Project Graph.");
  else if (nodes.length === 0) renderStatus(elements, "No results", "Adjust the search or filters to show files.");
  else hideStatus(elements);

  renderEdges(elements.edgeLayer, edges, nodeById);
  renderNodes(elements.nodeLayer, nodes, state.selectedNodeId);
  renderDetail(elements.detailPanel, state);
  updateStageSize(elements, state, nodes);
}

function renderNodes(container: HTMLElement, nodes: readonly RepositoryGraphViewNode[], selectedNodeId: string | null): void {
  const fragment = document.createDocumentFragment();
  for (const node of nodes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "crystal-repository-graph-view__node";
    button.dataset.repositoryGraphNodeId = node.id;
    button.setAttribute("aria-pressed", String(node.id === selectedNodeId));
    button.style.left = `${node.x}px`;
    button.style.top = `${node.y}px`;
    button.style.width = `${node.width}px`;
    button.style.height = `${node.height}px`;

    const title = document.createElement("strong");
    title.className = "crystal-repository-graph-view__node-name";
    title.textContent = node.name;
    const path = document.createElement("span");
    path.className = "crystal-repository-graph-view__node-path";
    path.textContent = node.relativePath;
    const meta = document.createElement("span");
    meta.className = "crystal-repository-graph-view__node-meta";
    meta.textContent = `${node.kind} · ${formatBytes(node.sizeBytes)} · ${formatDate(node.modifiedAtMs)}`;
    const connections = document.createElement("span");
    connections.className = "crystal-repository-graph-view__node-connections";
    connections.textContent = `${node.incomingCount} in · ${node.outgoingCount} out · ${node.unresolvedCount + node.externalCount} unrepresented`;
    button.append(title, path, meta, connections);
    fragment.append(button);
  }
  container.replaceChildren(fragment);
}

function renderEdges(svg: SVGSVGElement, edges: readonly RepositoryGraphViewEdge[], nodeById: ReadonlyMap<string, RepositoryGraphViewNode>): void {
  clearSvgEdges(svg);
  const fragment = document.createDocumentFragment();
  for (const edge of edges) {
    const from = nodeById.get(edge.fromNodeId);
    const to = nodeById.get(edge.toNodeId);
    if (!from || !to) continue;
    const line = document.createElementNS(SVG_NAMESPACE, "line");
    line.setAttribute("class", "crystal-repository-graph-view__edge");
    line.setAttribute("x1", String(from.x + from.width));
    line.setAttribute("y1", String(from.y + from.height / 2));
    line.setAttribute("x2", String(to.x));
    line.setAttribute("y2", String(to.y + to.height / 2));
    line.setAttribute("marker-end", "url(#crystal-repository-graph-arrow)");
    line.dataset.repositoryGraphEdgeId = edge.id;
    fragment.append(line);
  }
  svg.append(fragment);
}

function renderDetail(container: HTMLElement, state: RepositoryGraphViewState): void {
  const node = getRepositoryGraphNode(state, state.selectedNodeId);
  if (!node || !state.model) {
    renderEmptyDetail(container);
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = node.name;
  const metadata = document.createElement("dl");
  metadata.className = "crystal-repository-graph-view__detail-list";
  appendDetail(metadata, "Path", node.relativePath);
  appendDetail(metadata, "Extension", node.extension || "—");
  appendDetail(metadata, "Folder", node.directoryPath);
  appendDetail(metadata, "Type", node.kind);
  appendDetail(metadata, "Size", formatBytes(node.sizeBytes));
  appendDetail(metadata, "Modified", formatDate(node.modifiedAtMs));
  appendDetail(metadata, "Incoming", String(node.incomingCount));
  appendDetail(metadata, "Outgoing", String(node.outgoingCount));
  appendDetail(metadata, "Unresolved", String(node.unresolvedCount));
  appendDetail(metadata, "External", String(node.externalCount));

  const neighborHeading = document.createElement("h4");
  neighborHeading.textContent = "Connected files";
  const neighbors = document.createElement("div");
  neighbors.className = "crystal-repository-graph-view__neighbors";
  const neighborIds = new Set<string>();
  for (const edge of state.model.edges) {
    if (edge.fromNodeId === node.id) neighborIds.add(edge.toNodeId);
    if (edge.toNodeId === node.id) neighborIds.add(edge.fromNodeId);
  }
  for (const neighborId of [...neighborIds].sort()) {
    const neighbor = getRepositoryGraphNode(state, neighborId);
    if (!neighbor) continue;
    const button = document.createElement("button");
    button.type = "button";
    const data = button.dataset;
    data.repositoryGraphNeighborId = neighbor.id;
    button.textContent = neighbor.relativePath;
    neighbors.append(button);
  }
  if (neighbors.childElementCount === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No represented connections.";
    neighbors.append(empty);
  }
  container.replaceChildren(heading, metadata, neighborHeading, neighbors);
}

function renderEmptyDetail(container: HTMLElement): void {
  const heading = document.createElement("h3");
  heading.textContent = "File details";
  const text = document.createElement("p");
  text.textContent = "Select a node to inspect read-only Project Graph metadata.";
  container.replaceChildren(heading, text);
}

function appendDetail(list: HTMLDListElement, label: string, value: string): void {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const definition = document.createElement("dd");
  term.textContent = label;
  definition.textContent = value;
  wrapper.append(term, definition);
  list.append(wrapper);
}

function synchronizeKindOptions(select: HTMLSelectElement, kinds: readonly string[]): void {
  const currentValue = select.value || "all";
  const expected = ["all", ...kinds];
  if (select.options.length !== expected.length || expected.some((value, index) => select.options[index]?.value !== value)) {
    const options = expected.map((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value === "all" ? "All types" : value;
      return option;
    });
    select.replaceChildren(...options);
  }
  select.value = expected.includes(currentValue) ? currentValue : "all";
}

function updateStageSize(elements: RepositoryGraphViewElements, state: RepositoryGraphViewState, nodes: readonly RepositoryGraphViewNode[]): void {
  const modelBounds = state.model?.bounds ?? { width: 0, height: 0 };
  const maxRight = nodes.reduce((value, node) => Math.max(value, node.x + node.width + 48), modelBounds.width);
  const maxBottom = nodes.reduce((value, node) => Math.max(value, node.y + node.height + 48), modelBounds.height);
  elements.stage.style.width = `${Math.max(1, maxRight)}px`;
  elements.stage.style.height = `${Math.max(1, maxBottom)}px`;
  elements.edgeLayer.setAttribute("width", String(Math.max(1, maxRight)));
  elements.edgeLayer.setAttribute("height", String(Math.max(1, maxBottom)));
  elements.edgeLayer.setAttribute("viewBox", `0 0 ${Math.max(1, maxRight)} ${Math.max(1, maxBottom)}`);
}

function renderStatus(elements: RepositoryGraphViewElements, title: string, detail: string): void {
  elements.status.hidden = false;
  elements.status.textContent = `${title}. ${detail}`;
}

function hideStatus(elements: RepositoryGraphViewElements): void {
  elements.status.hidden = true;
  elements.status.textContent = "";
}

function clearSvgEdges(svg: SVGSVGElement): void {
  svg.querySelectorAll("line").forEach((line) => line.remove());
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: number): string {
  return Number.isFinite(value) ? new Date(value).toLocaleString() : "Unknown";
}

function queryElement<TElement extends HTMLElement | SVGSVGElement>(root: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Repository Graph View element: ${selector}`);
  return element;
}
