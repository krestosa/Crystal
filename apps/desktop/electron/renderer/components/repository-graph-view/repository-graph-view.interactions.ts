import {
  centerRepositoryGraphNode,
  fitRepositoryGraphViewport,
  panRepositoryGraphViewport,
  resetRepositoryGraphViewport,
  zoomRepositoryGraphViewportAtPoint,
  type RepositoryGraphViewBounds
} from "../../../../../../packages/core/project/repository-graph-view";
import { getRepositoryGraphNode, moveRepositoryGraphNode } from "./repository-graph-view.state";
import { resolveRepositoryGraphNode, type RepositoryGraphNodeDragSession, type RepositoryGraphPanSession, type RepositoryGraphViewElements, type RepositoryGraphViewState } from "./repository-graph-view.types";

export function bindRepositoryGraphViewInteractions(elements: RepositoryGraphViewElements, state: RepositoryGraphViewState, render: () => void): () => void {
  const cleanup: Array<() => void> = [];
  let panSession: RepositoryGraphPanSession | null = null;
  let dragSession: RepositoryGraphNodeDragSession | null = null;

  const viewportSize = () => {
    const rect = elements.surface.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };

  const centerNode = (nodeId: string): void => {
    const node = getRepositoryGraphNode(state, nodeId);
    if (!node) return;
    state.selectedNodeId = node.id;
    state.viewport = centerRepositoryGraphNode(viewportSize(), node, state.viewport.zoom);
    render();
  };

  const onSearch = (): void => { state.query = elements.searchInput.value; render(); };
  const onKind = (): void => { state.kind = elements.kindSelect.value as RepositoryGraphViewState["kind"]; render(); };
  const onHideIsolated = (): void => { state.hideIsolated = elements.hideIsolatedInput.checked; render(); };
  const onEdgeMode = (): void => { state.edgeMode = elements.edgeModeSelect.value as RepositoryGraphViewState["edgeMode"]; render(); };
  const onFit = (): void => { state.viewport = fitRepositoryGraphViewport(calculateCurrentBounds(state), viewportSize()); render(); };
  const onReset = (): void => { state.viewport = resetRepositoryGraphViewport(); render(); };
  const onCenter = (): void => { if (state.selectedNodeId) centerNode(state.selectedNodeId); };

  const onWheel = (event: WheelEvent): void => {
    if (!state.model) return;
    event.preventDefault();
    const rect = elements.surface.getBoundingClientRect();
    const focus = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    state.viewport = zoomRepositoryGraphViewportAtPoint(state.viewport, focus, state.viewport.zoom * Math.exp(-event.deltaY * 0.0015));
    render();
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !state.model) return;
    const nodeElement = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-repository-graph-node-id]") : null;
    event.preventDefault();
    elements.surface.focus({ preventScroll: true });
    elements.surface.setPointerCapture(event.pointerId);
    if (nodeElement?.dataset.repositoryGraphNodeId) {
      const nodeId = nodeElement.dataset.repositoryGraphNodeId;
      state.selectedNodeId = nodeId;
      dragSession = { pointerId: event.pointerId, nodeId, lastClientX: event.clientX, lastClientY: event.clientY, moved: false };
      render();
      return;
    }
    panSession = { pointerId: event.pointerId, lastClientX: event.clientX, lastClientY: event.clientY };
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (dragSession?.pointerId === event.pointerId) {
      event.preventDefault();
      const deltaX = (event.clientX - dragSession.lastClientX) / state.viewport.zoom;
      const deltaY = (event.clientY - dragSession.lastClientY) / state.viewport.zoom;
      if (deltaX !== 0 || deltaY !== 0) dragSession.moved = true;
      moveRepositoryGraphNode(state, dragSession.nodeId, deltaX, deltaY);
      dragSession = { ...dragSession, lastClientX: event.clientX, lastClientY: event.clientY };
      render();
      return;
    }
    if (panSession?.pointerId === event.pointerId) {
      event.preventDefault();
      state.viewport = panRepositoryGraphViewport(state.viewport, event.clientX - panSession.lastClientX, event.clientY - panSession.lastClientY);
      panSession = { pointerId: event.pointerId, lastClientX: event.clientX, lastClientY: event.clientY };
      render();
    }
  };

  const finishPointer = (event: PointerEvent): void => {
    if (dragSession?.pointerId !== event.pointerId && panSession?.pointerId !== event.pointerId) return;
    dragSession = null;
    panSession = null;
    if (elements.surface.hasPointerCapture(event.pointerId)) elements.surface.releasePointerCapture(event.pointerId);
  };

  const onDoubleClick = (event: MouseEvent): void => {
    const nodeElement = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-repository-graph-node-id]") : null;
    const nodeId = nodeElement?.dataset.repositoryGraphNodeId;
    if (nodeId) centerNode(nodeId);
  };

  const onDetailClick = (event: MouseEvent): void => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-repository-graph-neighbor-id]") : null;
    const nodeId = button?.dataset.repositoryGraphNeighborId;
    if (nodeId) centerNode(nodeId);
  };

  const onResize = (): void => render();

  listen(elements.searchInput, "input", onSearch, cleanup);
  listen(elements.kindSelect, "change", onKind, cleanup);
  listen(elements.hideIsolatedInput, "change", onHideIsolated, cleanup);
  listen(elements.edgeModeSelect, "change", onEdgeMode, cleanup);
  listen(elements.fitButton, "click", onFit, cleanup);
  listen(elements.resetButton, "click", onReset, cleanup);
  listen(elements.centerButton, "click", onCenter, cleanup);
  listen(elements.surface, "wheel", onWheel, cleanup, { passive: false });
  listen(elements.surface, "pointerdown", onPointerDown, cleanup);
  listen(elements.surface, "pointermove", onPointerMove, cleanup);
  listen(elements.surface, "pointerup", finishPointer, cleanup);
  listen(elements.surface, "pointercancel", finishPointer, cleanup);
  listen(elements.surface, "dblclick", onDoubleClick, cleanup);
  listen(elements.detailPanel, "click", onDetailClick, cleanup);
  listen(window, "resize", onResize, cleanup);

  return () => {
    panSession = null;
    dragSession = null;
    for (const dispose of cleanup.splice(0).reverse()) dispose();
  };
}

function calculateCurrentBounds(state: RepositoryGraphViewState): RepositoryGraphViewBounds {
  if (!state.model || state.model.nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const nodes = state.model.nodes.map((node) => resolveRepositoryGraphNode(state, node));
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function listen(target: EventTarget, type: string, listener: (event: any) => void, cleanup: Array<() => void>, options?: AddEventListenerOptions): void {
  const eventListener = listener as EventListener;
  target.addEventListener(type, eventListener, options);
  cleanup.push(() => target.removeEventListener(type, eventListener, options));
}
