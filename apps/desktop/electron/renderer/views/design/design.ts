import { initializeProjectDesignCanvas } from "../../components/design-canvas/project-design-canvas";
import { initializeProjectDesignCanvasSelectionOverlay } from "../../components/design-canvas/selection-overlay/project-design-canvas-selection-overlay";

const CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH = 220;
const CRYSTAL_RIGHT_SIDEBAR_MAX_WIDTH = 420;
const CRYSTAL_MIN_CANVAS_WIDTH = 560;
const CRYSTAL_BOTTOM_DIAGNOSTICS_MIN_HEIGHT = 64;
const CRYSTAL_BOTTOM_DIAGNOSTICS_MAX_HEIGHT = 240;
const CRYSTAL_MIN_CANVAS_HEIGHT = 320;
const CRYSTAL_RESIZE_KEYBOARD_STEP = 12;

interface CrystalWorkspaceResizeSession {
  readonly pointerId: number;
  readonly axis: "x" | "y";
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startValue: number;
}

let activeWorkspaceResizeCleanup: (() => void) | null = null;

export function initializeDesignView(): void {
  const view = document.querySelector<HTMLElement>('[data-crystal-view="design"]');
  view?.setAttribute("data-ready", "true");
  initializeProjectDesignCanvas();
  initializeProjectDesignCanvasSelectionOverlay();
  initializeWorkspaceShellState();
  initializeWorkspaceResize();
}

function initializeWorkspaceShellState(): void {
  const workspace = document.querySelector<HTMLElement>("[data-crystal-workspace]");
  if (!workspace) return;

  const syncProjectOpenState = (isOpen: boolean): void => {
    workspace.setAttribute("data-crystal-project-open", String(isOpen));
  };

  window.addEventListener("crystal:workspace-project-opened", () => syncProjectOpenState(true));
  void window.crystal.project.getGraph().then((graph) => syncProjectOpenState(Boolean(graph))).catch(() => syncProjectOpenState(false));
}

function initializeWorkspaceResize(): void {
  activeWorkspaceResizeCleanup?.();

  const workspace = document.querySelector<HTMLElement>("[data-crystal-workspace]");
  const rightResizer = document.querySelector<HTMLElement>("[data-crystal-right-sidebar-resizer]");
  const bottomResizer = document.querySelector<HTMLElement>("[data-crystal-bottom-diagnostics-resizer]");
  const bottomDiagnostics = document.querySelector<HTMLDetailsElement>("[data-workspace-bottom-diagnostics]");
  if (!workspace || !rightResizer || !bottomResizer || !bottomDiagnostics) return;

  const cleanup: Array<() => void> = [];
  let rightWidth = readPixelCustomProperty(workspace, "--crystal-right-sidebar-width", 284);
  let bottomHeight = readPixelCustomProperty(workspace, "--crystal-bottom-diagnostics-height", 184);
  let resizeSession: CrystalWorkspaceResizeSession | null = null;

  const getMaxRightWidth = (): number => Math.max(CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, Math.min(CRYSTAL_RIGHT_SIDEBAR_MAX_WIDTH, workspace.getBoundingClientRect().width - CRYSTAL_MIN_CANVAS_WIDTH));
  const getMaxBottomHeight = (): number => Math.max(CRYSTAL_BOTTOM_DIAGNOSTICS_MIN_HEIGHT, Math.min(CRYSTAL_BOTTOM_DIAGNOSTICS_MAX_HEIGHT, workspace.getBoundingClientRect().height - CRYSTAL_MIN_CANVAS_HEIGHT));

  const setRightWidth = (nextWidth: number): void => {
    rightWidth = clampResizeValue(nextWidth, CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, getMaxRightWidth());
    workspace.style.setProperty("--crystal-right-sidebar-width", `${Math.round(rightWidth)}px`);
    syncSeparatorValue(rightResizer, CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, getMaxRightWidth(), rightWidth);
  };

  const setBottomHeight = (nextHeight: number): void => {
    bottomHeight = clampResizeValue(nextHeight, CRYSTAL_BOTTOM_DIAGNOSTICS_MIN_HEIGHT, getMaxBottomHeight());
    workspace.style.setProperty("--crystal-bottom-diagnostics-height", `${Math.round(bottomHeight)}px`);
    syncSeparatorValue(bottomResizer, CRYSTAL_BOTTOM_DIAGNOSTICS_MIN_HEIGHT, getMaxBottomHeight(), bottomHeight);
  };

  const startResize = (event: PointerEvent, axis: "x" | "y", startValue: number): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (axis === "y") bottomDiagnostics.open = true;
    resizeSession = { pointerId: event.pointerId, axis, startClientX: event.clientX, startClientY: event.clientY, startValue };
    const handle = axis === "x" ? rightResizer : bottomResizer;
    handle.setPointerCapture(event.pointerId);
    workspace.classList.toggle("crystal-design-view__workspace--resizing-right", axis === "x");
    workspace.classList.toggle("crystal-design-view__workspace--resizing-bottom", axis === "y");
  };

  const handleRightPointerDown = (event: PointerEvent): void => startResize(event, "x", rightWidth);
  const handleBottomPointerDown = (event: PointerEvent): void => startResize(event, "y", bottomHeight);

  const handlePointerMove = (event: PointerEvent): void => {
    if (!resizeSession || resizeSession.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (resizeSession.axis === "x") {
      setRightWidth(resizeSession.startValue - (event.clientX - resizeSession.startClientX));
      return;
    }
    setBottomHeight(resizeSession.startValue - (event.clientY - resizeSession.startClientY));
  };

  const finishResize = (event: PointerEvent): void => {
    if (!resizeSession || resizeSession.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const handle = resizeSession.axis === "x" ? rightResizer : bottomResizer;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    resizeSession = null;
    workspace.classList.remove("crystal-design-view__workspace--resizing-right", "crystal-design-view__workspace--resizing-bottom");
  };

  const handleRightKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    setRightWidth(rightWidth + direction * CRYSTAL_RESIZE_KEYBOARD_STEP);
  };

  const handleBottomKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    bottomDiagnostics.open = true;
    const direction = event.key === "ArrowUp" ? 1 : -1;
    setBottomHeight(bottomHeight + direction * CRYSTAL_RESIZE_KEYBOARD_STEP);
  };

  const handleWindowResize = (): void => {
    setRightWidth(rightWidth);
    setBottomHeight(bottomHeight);
  };

  setRightWidth(rightWidth);
  setBottomHeight(bottomHeight);

  rightResizer.addEventListener("pointerdown", handleRightPointerDown);
  bottomResizer.addEventListener("pointerdown", handleBottomPointerDown);
  rightResizer.addEventListener("pointermove", handlePointerMove);
  bottomResizer.addEventListener("pointermove", handlePointerMove);
  rightResizer.addEventListener("pointerup", finishResize);
  bottomResizer.addEventListener("pointerup", finishResize);
  rightResizer.addEventListener("pointercancel", finishResize);
  bottomResizer.addEventListener("pointercancel", finishResize);
  rightResizer.addEventListener("keydown", handleRightKeyDown);
  bottomResizer.addEventListener("keydown", handleBottomKeyDown);
  window.addEventListener("resize", handleWindowResize);

  cleanup.push(() => rightResizer.removeEventListener("pointerdown", handleRightPointerDown));
  cleanup.push(() => bottomResizer.removeEventListener("pointerdown", handleBottomPointerDown));
  cleanup.push(() => rightResizer.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => bottomResizer.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => rightResizer.removeEventListener("pointerup", finishResize));
  cleanup.push(() => bottomResizer.removeEventListener("pointerup", finishResize));
  cleanup.push(() => rightResizer.removeEventListener("pointercancel", finishResize));
  cleanup.push(() => bottomResizer.removeEventListener("pointercancel", finishResize));
  cleanup.push(() => rightResizer.removeEventListener("keydown", handleRightKeyDown));
  cleanup.push(() => bottomResizer.removeEventListener("keydown", handleBottomKeyDown));
  cleanup.push(() => window.removeEventListener("resize", handleWindowResize));

  activeWorkspaceResizeCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeWorkspaceResizeCleanup = null;
  };
}

function syncSeparatorValue(separator: HTMLElement, min: number, max: number, value: number): void {
  separator.setAttribute("aria-valuemin", String(min));
  separator.setAttribute("aria-valuemax", String(Math.round(max)));
  separator.setAttribute("aria-valuenow", String(Math.round(value)));
}

function readPixelCustomProperty(element: HTMLElement, propertyName: string, fallback: number): number {
  const value = Number.parseFloat(element.style.getPropertyValue(propertyName));
  return Number.isFinite(value) ? value : fallback;
}

function clampResizeValue(value: number, min: number, max: number): number {
  const safeMax = Math.max(min, max);
  return Math.min(Math.max(value, min), safeMax);
}
