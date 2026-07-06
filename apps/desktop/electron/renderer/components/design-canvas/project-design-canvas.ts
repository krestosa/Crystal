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
  type ProjectDesignCanvasViewportState
} from "../../../../../../packages/core/project/design-canvas/project-design-canvas-viewport";
import { measureProjectDesignCanvasBounds, type ProjectDesignCanvasElements, type ProjectDesignCanvasInteractionTarget, type ProjectDesignCanvasPanSession, type ProjectDesignCanvasPanSource } from "./project-design-canvas.types";

const PROJECT_DESIGN_CANVAS_KEYBOARD_ZOOM_STEP = 1.2;
const PROJECT_DESIGN_CANVAS_KEYBOARD_PAN_STEP = 64;

let activeProjectDesignCanvasCleanup: (() => void) | null = null;
let sessionViewportState: ProjectDesignCanvasViewportState | null = null;

export function initializeProjectDesignCanvas(): void {
  activeProjectDesignCanvasCleanup?.();

  const root = document.querySelector<HTMLElement>("[data-project-design-canvas]");
  if (!root) return;

  const elements = getProjectDesignCanvasElements(root);
  const cleanup: Array<() => void> = [];
  let viewportState = sessionViewportState ?? createProjectDesignCanvasViewportState();
  let spacePressed = false;
  let modifierPressed = false;
  let panSession: ProjectDesignCanvasPanSession | null = null;

  const render = (): void => {
    sessionViewportState = viewportState;
    elements.stage.style.transform = `translate(${viewportState.panX}px, ${viewportState.panY}px) scale(${viewportState.zoom})`;
    elements.zoomDisplay.textContent = `${Math.round(viewportState.zoom * 100)}%`;
    elements.root.classList.toggle("crystal-project-design-canvas--space-active", spacePressed);
    elements.root.classList.toggle("crystal-project-design-canvas--modifier-active", modifierPressed);
    elements.root.classList.toggle("crystal-project-design-canvas--panning", viewportState.isPanning);
    elements.root.classList.toggle("crystal-project-design-canvas--capture-active", spacePressed || modifierPressed || viewportState.isPanning);
  };

  const setViewportState = (nextState: ProjectDesignCanvasViewportState): void => {
    viewportState = nextState;
    render();
  };

  const fitCanvas = (): void => setViewportState(calculateProjectDesignCanvasFitViewport(measureProjectDesignCanvasBounds(elements), Date.now()));
  const centerCanvas = (): void => setViewportState(calculateProjectDesignCanvasCenteredViewport(viewportState, measureProjectDesignCanvasBounds(elements), Date.now()));
  const resetCanvas = (): void => setViewportState(calculateProjectDesignCanvasResetViewport(measureProjectDesignCanvasBounds(elements), Date.now()));
  const zoomCanvasAtCenter = (nextZoom: number): void => {
    const bounds = measureProjectDesignCanvasBounds(elements);
    setViewportState(calculateProjectDesignCanvasZoomAtPoint(viewportState, bounds, { x: bounds.viewportWidth / 2, y: bounds.viewportHeight / 2 }, nextZoom, Date.now()));
  };

  const panCanvasBy = (deltaX: number, deltaY: number, source: ProjectDesignCanvasPanSource): void => {
    setViewportState(calculateProjectDesignCanvasPannedViewport({ ...viewportState, isPanning: source !== "keyboard" }, measureProjectDesignCanvasBounds(elements), deltaX, deltaY, Date.now()));
  };

  const handleWheel = (event: WheelEvent): void => {
    const wheelDelta = normalizeProjectDesignCanvasWheelDelta({ deltaX: event.deltaX, deltaY: event.deltaY, deltaMode: event.deltaMode });
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const bounds = measureProjectDesignCanvasBounds(elements);
      const surfaceRect = elements.surface.getBoundingClientRect();
      const focusPoint = { x: event.clientX - surfaceRect.left, y: event.clientY - surfaceRect.top };
      const zoomDelta = wheelDelta.y !== 0 ? wheelDelta.y : wheelDelta.x;
      const nextZoom = calculateProjectDesignCanvasWheelZoom(viewportState.zoom, zoomDelta);
      setViewportState(calculateProjectDesignCanvasZoomAtPoint(viewportState, bounds, focusPoint, nextZoom, Date.now()));
      return;
    }

    if (!shouldPanCanvasFromWheel(event, elements, spacePressed)) return;
    event.preventDefault();
    panCanvasBy(-wheelDelta.x, -wheelDelta.y, "trackpad");
  };

  const handlePointerDown = (event: PointerEvent): void => {
    const panSource = getProjectDesignCanvasPointerPanSource(event, elements, spacePressed, modifierPressed);
    if (!panSource) return;
    event.preventDefault();
    elements.surface.focus({ preventScroll: true });
    panSession = { pointerId: event.pointerId, lastClientX: event.clientX, lastClientY: event.clientY, source: panSource };
    elements.surface.setPointerCapture(event.pointerId);
    setViewportState({ ...viewportState, isPanning: true, lastInteractionAt: Date.now() });
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!panSession || panSession.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - panSession.lastClientX;
    const deltaY = event.clientY - panSession.lastClientY;
    panSession = { pointerId: event.pointerId, lastClientX: event.clientX, lastClientY: event.clientY, source: panSession.source };
    setViewportState(calculateProjectDesignCanvasPannedViewport(viewportState, measureProjectDesignCanvasBounds(elements), deltaX, deltaY, Date.now()));
  };

  const finishPanning = (event: PointerEvent): void => {
    if (!panSession || panSession.pointerId !== event.pointerId) return;
    panSession = null;
    if (elements.surface.hasPointerCapture(event.pointerId)) elements.surface.releasePointerCapture(event.pointerId);
    setViewportState(finishProjectDesignCanvasPanning(viewportState, measureProjectDesignCanvasBounds(elements), Date.now()));
  };

  const cancelPanning = (): void => {
    if (panSession && elements.surface.hasPointerCapture(panSession.pointerId)) elements.surface.releasePointerCapture(panSession.pointerId);
    panSession = null;
    setViewportState(finishProjectDesignCanvasPanning(viewportState, measureProjectDesignCanvasBounds(elements), Date.now()));
  };

  const handleAuxClick = (event: MouseEvent): void => {
    if (event.button === 1 && shouldUseCanvasBackgroundTarget(event.target, elements)) event.preventDefault();
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if ((event.key === "Control" || event.key === "Meta") && !isCrystalUiEditingTarget(event.target)) {
      modifierPressed = true;
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
    if (panSession) cancelPanning();
    else render();
  };

  const handleWindowResize = (): void => setViewportState(clampProjectDesignCanvasPan(viewportState, measureProjectDesignCanvasBounds(elements)));

  elements.fitButton.addEventListener("click", fitCanvas);
  elements.centerButton.addEventListener("click", centerCanvas);
  elements.resetButton.addEventListener("click", resetCanvas);
  elements.surface.addEventListener("wheel", handleWheel, { passive: false });
  elements.surface.addEventListener("pointerdown", handlePointerDown);
  elements.surface.addEventListener("pointermove", handlePointerMove);
  elements.surface.addEventListener("pointerup", finishPanning);
  elements.surface.addEventListener("pointercancel", finishPanning);
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
  cleanup.push(() => elements.surface.removeEventListener("pointerup", finishPanning));
  cleanup.push(() => elements.surface.removeEventListener("pointercancel", finishPanning));
  cleanup.push(() => elements.surface.removeEventListener("auxclick", handleAuxClick));
  cleanup.push(() => document.removeEventListener("keydown", handleKeyDown));
  cleanup.push(() => document.removeEventListener("keyup", handleKeyUp));
  cleanup.push(() => window.removeEventListener("blur", handleWindowBlur));
  cleanup.push(() => window.removeEventListener("resize", handleWindowResize));

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

function getProjectDesignCanvasPointerPanSource(event: PointerEvent, elements: ProjectDesignCanvasElements, spacePressed: boolean, modifierPressed: boolean): ProjectDesignCanvasPanSource | null {
  if (spacePressed && event.button === 0) return "space";
  if (event.button === 1 && shouldUseCanvasBackgroundTarget(event.target, elements)) return "middle";
  if (!modifierPressed && event.button === 0 && shouldUseCanvasBackgroundTarget(event.target, elements)) return "background";
  return null;
}

function shouldPanCanvasFromWheel(event: WheelEvent, elements: ProjectDesignCanvasElements, spacePressed: boolean): boolean {
  return spacePressed || shouldUseCanvasBackgroundTarget(event.target, elements);
}

function shouldUseCanvasBackgroundTarget(target: ProjectDesignCanvasInteractionTarget, elements: ProjectDesignCanvasElements): boolean {
  return target === elements.surface || target === elements.captureLayer;
}

function isDesignCanvasShortcutTarget(elements: ProjectDesignCanvasElements): boolean {
  const activeElement = document.activeElement;
  return activeElement instanceof Element && elements.root.contains(activeElement) && !isCrystalUiEditingTarget(activeElement);
}

function isCrystalUiEditingTarget(target: ProjectDesignCanvasInteractionTarget): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest('button, input, select, textarea, [contenteditable="true"], [role="textbox"]');
}
