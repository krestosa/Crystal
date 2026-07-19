import type { RepositoryGraphPoint, RepositoryGraphViewBounds, RepositoryGraphViewNode, RepositoryGraphViewport, RepositoryGraphViewportSize } from "./repository-graph-view.types";

export const REPOSITORY_GRAPH_MIN_ZOOM = 0.2;
export const REPOSITORY_GRAPH_MAX_ZOOM = 4;
export const REPOSITORY_GRAPH_DEFAULT_ZOOM = 1;
const FIT_PADDING = 48;

export function createRepositoryGraphViewport(): RepositoryGraphViewport {
  return { panX: 0, panY: 0, zoom: REPOSITORY_GRAPH_DEFAULT_ZOOM };
}

export function resetRepositoryGraphViewport(): RepositoryGraphViewport {
  return createRepositoryGraphViewport();
}

export function panRepositoryGraphViewport(viewport: RepositoryGraphViewport, deltaX: number, deltaY: number): RepositoryGraphViewport {
  return { ...viewport, panX: viewport.panX + deltaX, panY: viewport.panY + deltaY };
}

export function zoomRepositoryGraphViewportAtPoint(viewport: RepositoryGraphViewport, focus: RepositoryGraphPoint, nextZoom: number): RepositoryGraphViewport {
  const zoom = clampZoom(nextZoom);
  const worldX = (focus.x - viewport.panX) / viewport.zoom;
  const worldY = (focus.y - viewport.panY) / viewport.zoom;
  return { zoom, panX: focus.x - worldX * zoom, panY: focus.y - worldY * zoom };
}

export function fitRepositoryGraphViewport(bounds: RepositoryGraphViewBounds, viewportSize: RepositoryGraphViewportSize): RepositoryGraphViewport {
  if (bounds.width <= 0 || bounds.height <= 0 || viewportSize.width <= 0 || viewportSize.height <= 0) return createRepositoryGraphViewport();
  const availableWidth = Math.max(1, viewportSize.width - FIT_PADDING * 2);
  const availableHeight = Math.max(1, viewportSize.height - FIT_PADDING * 2);
  const zoom = clampZoom(Math.min(availableWidth / bounds.width, availableHeight / bounds.height));
  return {
    zoom,
    panX: (viewportSize.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    panY: (viewportSize.height - bounds.height * zoom) / 2 - bounds.y * zoom
  };
}

export function centerRepositoryGraphNode(viewportSize: RepositoryGraphViewportSize, node: Pick<RepositoryGraphViewNode, "x" | "y" | "width" | "height">, zoom: number): RepositoryGraphViewport {
  const safeZoom = clampZoom(zoom);
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  return {
    zoom: safeZoom,
    panX: viewportSize.width / 2 - centerX * safeZoom,
    panY: viewportSize.height / 2 - centerY * safeZoom
  };
}

export function clampRepositoryGraphZoom(value: number): number {
  return clampZoom(value);
}

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return REPOSITORY_GRAPH_DEFAULT_ZOOM;
  return Math.min(REPOSITORY_GRAPH_MAX_ZOOM, Math.max(REPOSITORY_GRAPH_MIN_ZOOM, value));
}
