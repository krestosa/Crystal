export interface ProjectDesignCanvasViewportState {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly isPanning: boolean;
  readonly lastInteractionAt: number | null;
}

export interface ProjectDesignCanvasBounds {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

export interface ProjectDesignCanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface ProjectDesignCanvasWheelDelta {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaMode: number;
}

export interface ProjectDesignCanvasStateOverrides {
  readonly zoom?: number;
  readonly panX?: number;
  readonly panY?: number;
  readonly isPanning?: boolean;
  readonly lastInteractionAt?: number | null;
}

export const PROJECT_DESIGN_CANVAS_MIN_ZOOM = 0.02;
export const PROJECT_DESIGN_CANVAS_MAX_ZOOM = 64;
export const PROJECT_DESIGN_CANVAS_DEFAULT_ZOOM = 1;
export const PROJECT_DESIGN_CANVAS_WHEEL_ZOOM_RATE = 0.0024;
export const PROJECT_DESIGN_CANVAS_FIT_PADDING = 48;
export const PROJECT_DESIGN_CANVAS_PAN_RECOVERY_MARGIN = 96;
export const PROJECT_DESIGN_CANVAS_WHEEL_LINE_SIZE = 16;
export const PROJECT_DESIGN_CANVAS_WHEEL_PAGE_SIZE = 800;

export function createProjectDesignCanvasViewportState(overrides: ProjectDesignCanvasStateOverrides = {}): ProjectDesignCanvasViewportState {
  return {
    zoom: clampProjectDesignCanvasZoom(overrides.zoom ?? PROJECT_DESIGN_CANVAS_DEFAULT_ZOOM),
    panX: normalizeProjectDesignCanvasNumber(overrides.panX ?? 0, 0),
    panY: normalizeProjectDesignCanvasNumber(overrides.panY ?? 0, 0),
    isPanning: overrides.isPanning ?? false,
    lastInteractionAt: overrides.lastInteractionAt ?? null
  };
}

export function clampProjectDesignCanvasZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return PROJECT_DESIGN_CANVAS_DEFAULT_ZOOM;
  return Math.min(PROJECT_DESIGN_CANVAS_MAX_ZOOM, Math.max(PROJECT_DESIGN_CANVAS_MIN_ZOOM, zoom));
}

export function normalizeProjectDesignCanvasWheelDelta(delta: ProjectDesignCanvasWheelDelta): ProjectDesignCanvasPoint {
  const multiplier = getProjectDesignCanvasWheelDeltaModeMultiplier(delta.deltaMode);
  return {
    x: normalizeProjectDesignCanvasNumber(delta.deltaX, 0) * multiplier,
    y: normalizeProjectDesignCanvasNumber(delta.deltaY, 0) * multiplier
  };
}

export function calculateProjectDesignCanvasWheelZoom(currentZoom: number, wheelDelta: number): number {
  const safeDelta = normalizeProjectDesignCanvasNumber(wheelDelta, 0);
  return clampProjectDesignCanvasZoom(currentZoom * Math.exp(-safeDelta * PROJECT_DESIGN_CANVAS_WHEEL_ZOOM_RATE));
}

export function calculateProjectDesignCanvasFitViewport(bounds: ProjectDesignCanvasBounds, timestamp: number): ProjectDesignCanvasViewportState {
  const normalizedBounds = normalizeProjectDesignCanvasBounds(bounds);
  const availableWidth = Math.max(1, normalizedBounds.viewportWidth - PROJECT_DESIGN_CANVAS_FIT_PADDING * 2);
  const availableHeight = Math.max(1, normalizedBounds.viewportHeight - PROJECT_DESIGN_CANVAS_FIT_PADDING * 2);
  const nextZoom = clampProjectDesignCanvasZoom(Math.min(availableWidth / normalizedBounds.frameWidth, availableHeight / normalizedBounds.frameHeight));
  return calculateProjectDesignCanvasCenteredViewport(createProjectDesignCanvasViewportState({ zoom: nextZoom }), normalizedBounds, timestamp);
}

export function calculateProjectDesignCanvasCenteredViewport(state: ProjectDesignCanvasViewportState, bounds: ProjectDesignCanvasBounds, timestamp: number): ProjectDesignCanvasViewportState {
  const normalizedBounds = normalizeProjectDesignCanvasBounds(bounds);
  const normalizedState = createProjectDesignCanvasViewportState(state);
  return {
    ...normalizedState,
    panX: (normalizedBounds.viewportWidth - normalizedBounds.frameWidth * normalizedState.zoom) / 2,
    panY: (normalizedBounds.viewportHeight - normalizedBounds.frameHeight * normalizedState.zoom) / 2,
    isPanning: false,
    lastInteractionAt: timestamp
  };
}

export function calculateProjectDesignCanvasResetViewport(bounds: ProjectDesignCanvasBounds, timestamp: number): ProjectDesignCanvasViewportState {
  return calculateProjectDesignCanvasCenteredViewport(createProjectDesignCanvasViewportState(), bounds, timestamp);
}

export function calculateProjectDesignCanvasZoomAtPoint(state: ProjectDesignCanvasViewportState, bounds: ProjectDesignCanvasBounds, focusPoint: ProjectDesignCanvasPoint, nextZoom: number, timestamp: number): ProjectDesignCanvasViewportState {
  const normalizedState = createProjectDesignCanvasViewportState(state);
  const zoom = clampProjectDesignCanvasZoom(nextZoom);
  const safeCurrentZoom = Math.max(PROJECT_DESIGN_CANVAS_MIN_ZOOM, normalizedState.zoom);
  const safeFocusX = normalizeProjectDesignCanvasNumber(focusPoint.x, 0);
  const safeFocusY = normalizeProjectDesignCanvasNumber(focusPoint.y, 0);
  const contentX = (safeFocusX - normalizedState.panX) / safeCurrentZoom;
  const contentY = (safeFocusY - normalizedState.panY) / safeCurrentZoom;

  return clampProjectDesignCanvasPan({
    ...normalizedState,
    zoom,
    panX: safeFocusX - contentX * zoom,
    panY: safeFocusY - contentY * zoom,
    lastInteractionAt: timestamp
  }, bounds);
}

export function calculateProjectDesignCanvasPannedViewport(state: ProjectDesignCanvasViewportState, bounds: ProjectDesignCanvasBounds, deltaX: number, deltaY: number, timestamp: number): ProjectDesignCanvasViewportState {
  const normalizedState = createProjectDesignCanvasViewportState(state);
  return clampProjectDesignCanvasPan({
    ...normalizedState,
    panX: normalizedState.panX + normalizeProjectDesignCanvasNumber(deltaX, 0),
    panY: normalizedState.panY + normalizeProjectDesignCanvasNumber(deltaY, 0),
    isPanning: true,
    lastInteractionAt: timestamp
  }, bounds);
}

export function finishProjectDesignCanvasPanning(state: ProjectDesignCanvasViewportState, bounds: ProjectDesignCanvasBounds, timestamp: number): ProjectDesignCanvasViewportState {
  return clampProjectDesignCanvasPan({
    ...createProjectDesignCanvasViewportState(state),
    isPanning: false,
    lastInteractionAt: timestamp
  }, bounds);
}

export function clampProjectDesignCanvasPan(state: ProjectDesignCanvasViewportState, bounds: ProjectDesignCanvasBounds): ProjectDesignCanvasViewportState {
  const normalizedBounds = normalizeProjectDesignCanvasBounds(bounds);
  const normalizedState = createProjectDesignCanvasViewportState(state);
  return {
    ...normalizedState,
    panX: clampProjectDesignCanvasAxis(normalizedState.panX, normalizedBounds.viewportWidth, normalizedBounds.frameWidth * normalizedState.zoom),
    panY: clampProjectDesignCanvasAxis(normalizedState.panY, normalizedBounds.viewportHeight, normalizedBounds.frameHeight * normalizedState.zoom)
  };
}

function getProjectDesignCanvasWheelDeltaModeMultiplier(deltaMode: number): number {
  if (deltaMode === 1) return PROJECT_DESIGN_CANVAS_WHEEL_LINE_SIZE;
  if (deltaMode === 2) return PROJECT_DESIGN_CANVAS_WHEEL_PAGE_SIZE;
  return 1;
}

function clampProjectDesignCanvasAxis(pan: number, viewportSize: number, scaledFrameSize: number): number {
  const min = PROJECT_DESIGN_CANVAS_PAN_RECOVERY_MARGIN - scaledFrameSize;
  const max = viewportSize - PROJECT_DESIGN_CANVAS_PAN_RECOVERY_MARGIN;
  if (min > max) return (viewportSize - scaledFrameSize) / 2;
  return Math.min(max, Math.max(min, normalizeProjectDesignCanvasNumber(pan, 0)));
}

function normalizeProjectDesignCanvasBounds(bounds: ProjectDesignCanvasBounds): ProjectDesignCanvasBounds {
  return {
    viewportWidth: Math.max(1, normalizeProjectDesignCanvasNumber(bounds.viewportWidth, 1)),
    viewportHeight: Math.max(1, normalizeProjectDesignCanvasNumber(bounds.viewportHeight, 1)),
    frameWidth: Math.max(1, normalizeProjectDesignCanvasNumber(bounds.frameWidth, 1)),
    frameHeight: Math.max(1, normalizeProjectDesignCanvasNumber(bounds.frameHeight, 1))
  };
}

function normalizeProjectDesignCanvasNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
