import {
  PROJECT_DESIGN_CANVAS_DEFAULT_ZOOM,
  calculateProjectDesignCanvasCenteredViewport,
  calculateProjectDesignCanvasFitViewport,
  calculateProjectDesignCanvasPannedViewport,
  calculateProjectDesignCanvasResetViewport,
  calculateProjectDesignCanvasWheelZoom,
  calculateProjectDesignCanvasZoomAtPoint,
  clampProjectDesignCanvasPan,
  createProjectDesignCanvasViewportState,
  finishProjectDesignCanvasPanning,
  normalizeProjectDesignCanvasWheelDelta,
  type ProjectDesignCanvasPoint,
  type ProjectDesignCanvasViewportState
} from "../../../../../../packages/core/project/design-canvas/project-design-canvas-viewport";
import { measureProjectDesignCanvasBounds, type ProjectDesignCanvasElements, type ProjectDesignCanvasInteractionTarget, type ProjectDesignCanvasPanSession, type ProjectDesignCanvasPanSource } from "./project-design-canvas.types";

const PROJECT_DESIGN_CANVAS_KEYBOARD_ZOOM_STEP = 1.2;
const PROJECT_DESIGN_CANVAS_KEYBOARD_PAN_STEP = 64;
const PROJECT_DESIGN_CANVAS_ZOOM_CAPTURE_RELEASE_DELAY = 180;
const PROJECT_DESIGN_CANVAS_DOUBLE_TAP_WINDOW_MS = 320;
const PROJECT_DESIGN_CANVAS_DOUBLE_TAP_DISTANCE = 14;
const PROJECT_DESIGN_CANVAS_DOUBLE_TAP_CLICK_DETAIL = 2;

type ProjectDesignCanvasNavigationMode = "idle" | "panning" | "zooming-wheel" | "zooming-drag";
type ProjectDesignCanvasWheelGestureKind = "zoom-canvas" | "pan-canvas" | "pass-through-iframe-scroll" | "ignore";
type ProjectDesignCanvasPointerGestureKind = "zoom-canvas-drag" | "pan-canvas" | "ignore";

interface ProjectDesignCanvasWheelGesture {
  readonly kind: ProjectDesignCanvasWheelGestureKind;
  readonly delta: ProjectDesignCanvasPoint;
  readonly zoomDelta: number;
  readonly focusPoint: ProjectDesignCanvasPoint;
}

interface ProjectDesignCanvasPointerGesture {
  readonly kind: ProjectDesignCanvasPointerGestureKind;
  readonly panSource?: ProjectDesignCanvasPanSource;
}

interface ProjectDesignCanvasZoomDragSession {
  readonly pointerId: number;
  readonly startClientY: number;
  readonly startZoom: number;
  readonly focusPoint: ProjectDesignCanvasPoint;
  readonly startViewport: ProjectDesignCanvasViewportState;
}

interface ProjectDesignCanvasNavigationTap {
  readonly timestamp: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly pointerType: string;
}

let activeProjectDesignCanvasCleanup: (() => void) | null = null;
let sessionViewportState: ProjectDesignCanvasViewportState | null = null;

export function initializeProjectDesignCanvas(): void {
  activeProjectDesignCanvasCleanup?.();

  const root = document.querySelector<HTMLElement>("[data-project-design-canvas]");
  if (!root) return;

  const elements = getProjectDesignCanvasElements(root);
  const cleanup: Array<() => void> = [];
  let viewportState = sessionViewportState ?? createProjectDesignCanvasViewportState();
  let navigationMode: ProjectDesignCanvasNavigationMode = "idle";
  let spacePressed = false;
  let modifierPressed = false;
  let zoomGestureActive = false;
  let zoomCaptureReleaseTimer: number | null = null;
  let panSession: ProjectDesignCanvasPanSession | null = null;
  let zoomDragSession: ProjectDesignCanvasZoomDragSession | null = null;
  let lastNavigationTap: ProjectDesignCanvasNavigationTap | null = null;

  const render = (): void => {
    const zooming = zoomGestureActive || navigationMode === "zooming-wheel" || navigationMode === "zooming-drag";
    const panning = navigationMode === "panning" || viewportState.isPanning;
    sessionViewportState = viewportState;
    elements.stage.style.transform = `translate(${viewportState.panX}px, ${viewportState.panY}px) scale(${viewportState.zoom})`;
    elements.zoomDisplay.textContent = `${Math.round(viewportState.zoom * 100)}%`;
    elements.root.classList.toggle("crystal-project-design-canvas--space-active", spacePressed);
    elements.root.classList.toggle("crystal-project-design-canvas--modifier-active", modifierPressed);
    elements.root.classList.toggle("crystal-project-design-canvas--zoom-active", zooming);
    elements.root.classList.toggle("crystal-project-design-canvas--zoom-dragging", navigationMode === "zooming-drag");
    elements.root.classList.toggle("crystal-project-design-canvas--panning", panning);
    elements.root.classList.toggle("crystal-project-design-canvas--capture-active", spacePressed || modifierPressed || zooming || panning);
  };

  const setViewportState = (nextState: ProjectDesignCanvasViewportState): void => {
    viewportState = nextState;
    render();
  };

  const clearZoomCaptureReleaseTimer = (): void => {
    if (zoomCaptureReleaseTimer === null) return;
    window.clearTimeout(zoomCaptureReleaseTimer);
    zoomCaptureReleaseTimer = null;
  };

  const releaseZoomCaptureSoon = (): void => {
    clearZoomCaptureReleaseTimer();
    if (modifierPressed || zoomDragSession) return;
    zoomCaptureReleaseTimer = window.setTimeout(() => {
      zoomCaptureReleaseTimer = null;
      zoomGestureActive = false;
      if (navigationMode === "zooming-wheel") navigationMode = "idle";
      render();
    }, PROJECT_DESIGN_CANVAS_ZOOM_CAPTURE_RELEASE_DELAY);
  };

  const activateZoomCapture = (): void => {
    zoomGestureActive = true;
    navigationMode = "zooming-wheel";
    render();
    releaseZoomCaptureSoon();
  };

  const clearZoomCapture = (): void => {
    clearZoomCaptureReleaseTimer();
    zoomGestureActive = false;
    if (navigationMode === "zooming-wheel" || navigationMode === "zooming-drag") navigationMode = "idle";
  };

  const fitCanvas = (): void => setViewportState(calculateProjectDesignCanvasFitViewport(measureProjectDesignCanvasBounds(elements), Date.now()));
  const centerCanvas = (): void => setViewportState(calculateProjectDesignCanvasCenteredViewport(viewportState, measureProjectDesignCanvasBounds(elements), Date.now()));
  const resetCanvas = (): void => setViewportState(calculateProjectDesignCanvasResetViewport(measureProjectDesignCanvasBounds(elements), Date.now()));
  const zoomCanvasAtCenter = (nextZoom: number): void => {
    const bounds = measureProjectDesignCanvasBounds(elements);
    setViewportState(calculateProjectDesignCanvasZoomAtPoint(viewportState, bounds, { x: bounds.viewportWidth / 2, y: bounds.viewportHeight / 2 }, nextZoom, Date.now()));
  };

  const panCanvasBy = (deltaX: number, deltaY: number, source: ProjectDesignCanvasPanSource): void => {
    const keepPanningState = source === "space" || source === "middle" || source === "background";
    const nextState = calculateProjectDesignCanvasPannedViewport({ ...viewportState, isPanning: keepPanningState }, measureProjectDesignCanvasBounds(elements), deltaX, deltaY, Date.now());
    setViewportState({ ...nextState, isPanning: keepPanningState });
  };

  const handleWheel = (event: WheelEvent): void => {
    const gesture = classifyCanvasWheelGesture(event, elements, spacePressed, modifierPressed);

    if (gesture.kind === "ignore") return;

    if (gesture.kind === "pass-through-iframe-scroll") {
      event.stopPropagation();
      return;
    }

    if (gesture.kind === "zoom-canvas") {
      event.preventDefault();
      event.stopPropagation();
      activateZoomCapture();
      const bounds = measureProjectDesignCanvasBounds(elements);
      const nextZoom = calculateProjectDesignCanvasWheelZoom(viewportState.zoom, gesture.zoomDelta);
      setViewportState(calculateProjectDesignCanvasZoomAtPoint(viewportState, bounds, gesture.focusPoint, nextZoom, Date.now()));
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    panCanvasBy(-gesture.delta.x, -gesture.delta.y, "trackpad");
  };

  const startZoomDrag = (event: PointerEvent): void => {
    clearZoomCaptureReleaseTimer();
    zoomGestureActive = true;
    navigationMode = "zooming-drag";
    zoomDragSession = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startZoom: viewportState.zoom,
      focusPoint: getProjectDesignCanvasPointerFocusPoint(event, elements),
      startViewport: viewportState
    };
    elements.surface.setPointerCapture(event.pointerId);
    setViewportState({ ...viewportState, isPanning: false, lastInteractionAt: Date.now() });
  };

  const handlePointerDown = (event: PointerEvent): void => {
    const pointerGesture = classifyCanvasPointerGesture(event, elements, spacePressed, modifierPressed, lastNavigationTap);
    if (pointerGesture.kind === "ignore") return;
    event.preventDefault();
    event.stopPropagation();
    elements.surface.focus({ preventScroll: true });

    if (pointerGesture.kind === "zoom-canvas-drag") {
      lastNavigationTap = null;
      startZoomDrag(event);
      return;
    }

    if (!pointerGesture.panSource) return;
    lastNavigationTap = shouldRememberCanvasNavigationTap(event, elements, spacePressed, modifierPressed) ? createProjectDesignCanvasNavigationTap(event) : null;
    navigationMode = "panning";
    panSession = { pointerId: event.pointerId, lastClientX: event.clientX, lastClientY: event.clientY, source: pointerGesture.panSource };
    elements.surface.setPointerCapture(event.pointerId);
    setViewportState({ ...viewportState, isPanning: true, lastInteractionAt: Date.now() });
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (zoomDragSession && zoomDragSession.pointerId === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      const dragDeltaY = event.clientY - zoomDragSession.startClientY;
      const nextZoom = calculateProjectDesignCanvasWheelZoom(zoomDragSession.startZoom, dragDeltaY);
      setViewportState(calculateProjectDesignCanvasZoomAtPoint(zoomDragSession.startViewport, measureProjectDesignCanvasBounds(elements), zoomDragSession.focusPoint, nextZoom, Date.now()));
      return;
    }

    if (!panSession || panSession.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - panSession.lastClientX;
    const deltaY = event.clientY - panSession.lastClientY;
    panSession = { pointerId: event.pointerId, lastClientX: event.clientX, lastClientY: event.clientY, source: panSession.source };
    setViewportState(calculateProjectDesignCanvasPannedViewport(viewportState, measureProjectDesignCanvasBounds(elements), deltaX, deltaY, Date.now()));
  };

  const finishZoomDrag = (event: PointerEvent): void => {
    if (!zoomDragSession || zoomDragSession.pointerId !== event.pointerId) return;
    event.stopPropagation();
    zoomDragSession = null;
    zoomGestureActive = false;
    navigationMode = "idle";
    if (elements.surface.hasPointerCapture(event.pointerId)) elements.surface.releasePointerCapture(event.pointerId);
    setViewportState({ ...viewportState, isPanning: false, lastInteractionAt: Date.now() });
  };

  const finishPanning = (event: PointerEvent): void => {
    if (!panSession || panSession.pointerId !== event.pointerId) return;
    event.stopPropagation();
    panSession = null;
    navigationMode = "idle";
    if (elements.surface.hasPointerCapture(event.pointerId)) elements.surface.releasePointerCapture(event.pointerId);
    setViewportState(finishProjectDesignCanvasPanning(viewportState, measureProjectDesignCanvasBounds(elements), Date.now()));
  };

  const handlePointerRelease = (event: PointerEvent): void => {
    if (zoomDragSession?.pointerId === event.pointerId) {
      finishZoomDrag(event);
      return;
    }
    finishPanning(event);
  };

  const cancelZoomDrag = (): void => {
    if (zoomDragSession && elements.surface.hasPointerCapture(zoomDragSession.pointerId)) elements.surface.releasePointerCapture(zoomDragSession.pointerId);
    zoomDragSession = null;
    zoomGestureActive = false;
    if (navigationMode === "zooming-drag") navigationMode = "idle";
    setViewportState({ ...viewportState, isPanning: false, lastInteractionAt: Date.now() });
  };

  const cancelPanning = (): void => {
    if (panSession && elements.surface.hasPointerCapture(panSession.pointerId)) elements.surface.releasePointerCapture(panSession.pointerId);
    panSession = null;
    if (navigationMode === "panning") navigationMode = "idle";
    setViewportState(finishProjectDesignCanvasPanning(viewportState, measureProjectDesignCanvasBounds(elements), Date.now()));
  };

  const cancelActiveNavigation = (): void => {
    const hadZoomDrag = !!zoomDragSession;
    const hadPan = !!panSession;
    if (hadZoomDrag) cancelZoomDrag();
    if (hadPan) cancelPanning();
    if (!hadZoomDrag && !hadPan) {
      clearZoomCapture();
      lastNavigationTap = null;
      render();
    }
  };

  const handleAuxClick = (event: MouseEvent): void => {
    if (event.button === 1 && shouldUseCanvasNavigationTarget(event.target, elements)) event.preventDefault();
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && (panSession || zoomDragSession || navigationMode !== "idle")) {
      event.preventDefault();
      cancelActiveNavigation();
      return;
    }
    if ((event.key === "Control" || event.key === "Meta") && !isCrystalUiEditingTarget(event.target)) {
      modifierPressed = true;
      clearZoomCaptureReleaseTimer();
      render();
    }
    if (handleShortcutKeyDown(event)) return;
    if (event.code !== "Space" || isCrystalUiEditingTarget(event.target)) return;
    event.preventDefault();
    if (spacePressed) return;
    spacePressed = true;
    render();
  };

  const handleShortcutKeyDown = (event: KeyboardEvent): boolean => {
    if (!isDesignCanvasShortcutTarget(elements) || isCrystalUiEditingTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return false;
    const key = event.key.toLowerCase();
    if (key === "+" || key === "=") {
      event.preventDefault();
      zoomCanvasAtCenter(viewportState.zoom * PROJECT_DESIGN_CANVAS_KEYBOARD_ZOOM_STEP);
      return true;
    }
    if (key === "-") {
      event.preventDefault();
      zoomCanvasAtCenter(viewportState.zoom / PROJECT_DESIGN_CANVAS_KEYBOARD_ZOOM_STEP);
      return true;
    }
    if (key === "0") {
      event.preventDefault();
      resetCanvas();
      return true;
    }
    if (key === "1") {
      event.preventDefault();
      zoomCanvasAtCenter(PROJECT_DESIGN_CANVAS_DEFAULT_ZOOM);
      return true;
    }
    if (key === "f") {
      event.preventDefault();
      fitCanvas();
      return true;
    }
    if (key === "c") {
      event.preventDefault();
      centerCanvas();
      return true;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      panCanvasBy(PROJECT_DESIGN_CANVAS_KEYBOARD_PAN_STEP, 0, "keyboard");
      return true;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      panCanvasBy(-PROJECT_DESIGN_CANVAS_KEYBOARD_PAN_STEP, 0, "keyboard");
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      panCanvasBy(0, PROJECT_DESIGN_CANVAS_KEYBOARD_PAN_STEP, "keyboard");
      return true;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      panCanvasBy(0, -PROJECT_DESIGN_CANVAS_KEYBOARD_PAN_STEP, "keyboard");
      return true;
    }
    return false;
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "Control" || event.key === "Meta") {
      modifierPressed = false;
      releaseZoomCaptureSoon();
      render();
    }
    if (event.code !== "Space") return;
    spacePressed = false;
    if (panSession) cancelPanning();
    else render();
  };

  const handleWindowBlur = (): void => {
    spacePressed = false;
    modifierPressed = false;
    lastNavigationTap = null;
    if (zoomDragSession || panSession || navigationMode !== "idle") cancelActiveNavigation();
    else {
      clearZoomCapture();
      render();
    }
  };

  const handleWindowResize = (): void => setViewportState(clampProjectDesignCanvasPan(viewportState, measureProjectDesignCanvasBounds(elements)));

  elements.fitButton.addEventListener("click", fitCanvas);
  elements.centerButton.addEventListener("click", centerCanvas);
  elements.resetButton.addEventListener("click", resetCanvas);
  elements.surface.addEventListener("wheel", handleWheel, { passive: false });
  elements.surface.addEventListener("pointerdown", handlePointerDown);
  elements.surface.addEventListener("pointermove", handlePointerMove);
  elements.surface.addEventListener("pointerup", handlePointerRelease);
  elements.surface.addEventListener("pointercancel", handlePointerRelease);
  elements.surface.addEventListener("auxclick", handleAuxClick);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("resize", handleWindowResize);

  cleanup.push(() => elements.fitButton.removeEventListener("click", fitCanvas));
  cleanup.push(() => elements.centerButton.removeEventListener("click", centerCanvas));
  cleanup.push(() => elements.resetButton.removeEventListener("click", resetCanvas));
  cleanup.push(() => elements.surface.removeEventListener("wheel", handleWheel));
  cleanup.push(() => elements.surface.removeEventListener("pointerdown", handlePointerDown));
  cleanup.push(() => elements.surface.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => elements.surface.removeEventListener("pointerup", handlePointerRelease));
  cleanup.push(() => elements.surface.removeEventListener("pointercancel", handlePointerRelease));
  cleanup.push(() => elements.surface.removeEventListener("auxclick", handleAuxClick));
  cleanup.push(() => document.removeEventListener("keydown", handleKeyDown));
  cleanup.push(() => document.removeEventListener("keyup", handleKeyUp));
  cleanup.push(() => window.removeEventListener("blur", handleWindowBlur));
  cleanup.push(() => window.removeEventListener("resize", handleWindowResize));
  cleanup.push(clearZoomCaptureReleaseTimer);

  activeProjectDesignCanvasCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeProjectDesignCanvasCleanup = null;
  };

  render();
  if (!sessionViewportState?.lastInteractionAt) window.requestAnimationFrame(centerCanvas);
}

function getProjectDesignCanvasElements(root: HTMLElement): ProjectDesignCanvasElements {
  return {
    root,
    surface: queryDesignCanvasElement(root, "[data-project-design-canvas-surface]", HTMLElement),
    stage: queryDesignCanvasElement(root, "[data-project-design-canvas-stage]", HTMLElement),
    pageFrame: queryDesignCanvasElement(root, "[data-project-design-canvas-page-frame]", HTMLElement),
    captureLayer: queryDesignCanvasElement(root, "[data-project-design-canvas-capture]", HTMLElement),
    zoomDisplay: queryDesignCanvasElement(root, "[data-project-design-canvas-zoom]", HTMLElement),
    fitButton: queryDesignCanvasElement(root, "[data-project-design-canvas-fit]", HTMLButtonElement),
    centerButton: queryDesignCanvasElement(root, "[data-project-design-canvas-center]", HTMLButtonElement),
    resetButton: queryDesignCanvasElement(root, "[data-project-design-canvas-reset]", HTMLButtonElement)
  };
}

function queryDesignCanvasElement<TElement extends HTMLElement>(root: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Design Canvas element: ${selector}`);
  return element;
}

function classifyCanvasWheelGesture(event: WheelEvent, elements: ProjectDesignCanvasElements, spacePressed: boolean, modifierPressed: boolean): ProjectDesignCanvasWheelGesture {
  const delta = normalizeProjectDesignCanvasWheelDelta({ deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode });
  const focusPoint = getProjectDesignCanvasPointerFocusPoint(event, elements);
  const zoomDelta = delta.y !== 0 ? delta.y : delta.x;
  if (delta.x === 0 && delta.y === 0) return { kind: "ignore", delta, zoomDelta, focusPoint };
  if (isCanvasZoomGesture(event, modifierPressed)) return { kind: "zoom-canvas", delta, zoomDelta, focusPoint };
  if (spacePressed || shouldUseCanvasNavigationTarget(event.target, elements)) return { kind: "pan-canvas", delta, zoomDelta, focusPoint };
  if (isCanvasIframeScrollTarget(event.target, elements)) return { kind: "pass-through-iframe-scroll", delta, zoomDelta, focusPoint };
  return { kind: "ignore", delta, zoomDelta, focusPoint };
}

function classifyCanvasPointerGesture(event: PointerEvent, elements: ProjectDesignCanvasElements, spacePressed: boolean, modifierPressed: boolean, lastNavigationTap: ProjectDesignCanvasNavigationTap | null): ProjectDesignCanvasPointerGesture {
  if (!shouldUseCanvasNavigationTarget(event.target, elements)) return { kind: "ignore" };
  if (isCanvasZoomDragPointerGesture(event, lastNavigationTap)) return { kind: "zoom-canvas-drag" };
  if (spacePressed && event.button === 0) return { kind: "pan-canvas", panSource: "space" };
  if (event.button === 1) return { kind: "pan-canvas", panSource: "middle" };
  if (!modifierPressed && event.button === 0) return { kind: "pan-canvas", panSource: "background" };
  return { kind: "ignore" };
}

function isCanvasZoomGesture(event: WheelEvent, modifierPressed: boolean): boolean {
  return event.ctrlKey || event.metaKey || modifierPressed;
}

function isCanvasZoomDragPointerGesture(event: PointerEvent, lastNavigationTap: ProjectDesignCanvasNavigationTap | null): boolean {
  if (event.button !== 0) return false;
  if (event.detail >= PROJECT_DESIGN_CANVAS_DOUBLE_TAP_CLICK_DETAIL) return true;
  if (!lastNavigationTap) return false;
  if (event.pointerType !== lastNavigationTap.pointerType) return false;
  if (Date.now() - lastNavigationTap.timestamp > PROJECT_DESIGN_CANVAS_DOUBLE_TAP_WINDOW_MS) return false;
  return Math.hypot(event.clientX - lastNavigationTap.clientX, event.clientY - lastNavigationTap.clientY) <= PROJECT_DESIGN_CANVAS_DOUBLE_TAP_DISTANCE;
}

function createProjectDesignCanvasNavigationTap(event: PointerEvent): ProjectDesignCanvasNavigationTap {
  return { timestamp: Date.now(), clientX: event.clientX, clientY: event.clientY, pointerType: event.pointerType };
}

function shouldRememberCanvasNavigationTap(event: PointerEvent, elements: ProjectDesignCanvasElements, spacePressed: boolean, modifierPressed: boolean): boolean {
  return event.button === 0 && !spacePressed && !modifierPressed && shouldUseCanvasNavigationTarget(event.target, elements);
}

function getProjectDesignCanvasPointerFocusPoint(event: MouseEvent, elements: ProjectDesignCanvasElements): ProjectDesignCanvasPoint {
  const surfaceRect = elements.surface.getBoundingClientRect();
  return { x: event.clientX - surfaceRect.left, y: event.clientY - surfaceRect.top };
}

function getProjectDesignCanvasPointerPanSource(event: PointerEvent, elements: ProjectDesignCanvasElements, spacePressed: boolean, modifierPressed: boolean): ProjectDesignCanvasPanSource | null {
  const pointerGesture = classifyCanvasPointerGesture(event, elements, spacePressed, modifierPressed, null);
  if (pointerGesture.kind !== "pan-canvas") return null;
  return pointerGesture.panSource ?? null;
}

function shouldUseCanvasNavigationTarget(target: ProjectDesignCanvasInteractionTarget, elements: ProjectDesignCanvasElements): boolean {
  if (target === elements.surface || target === elements.captureLayer) return true;
  return target instanceof Element && elements.surface.contains(target) && !isCanvasIframeScrollTarget(target, elements);
}

function isCanvasIframeScrollTarget(target: ProjectDesignCanvasInteractionTarget, elements: ProjectDesignCanvasElements): boolean {
  if (!(target instanceof Element) || !elements.surface.contains(target)) return false;
  return !!target.closest(".crystal-project-preview-panel__frame, .crystal-project-preview-panel__frame-wrap");
}

function isDesignCanvasShortcutTarget(elements: ProjectDesignCanvasElements): boolean {
  const activeElement = document.activeElement;
  return activeElement instanceof Element && elements.root.contains(activeElement) && !isCrystalUiEditingTarget(activeElement);
}

function isCrystalUiEditingTarget(target: ProjectDesignCanvasInteractionTarget): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest('button, input, select, textarea, [contenteditable="true"], [role="textbox"]');
}
