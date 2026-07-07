import { initializeProjectDesignCanvas } from "../../components/design-canvas/project-design-canvas";
import { initializeProjectDesignCanvasSelectionOverlay } from "../../components/design-canvas/selection-overlay/project-design-canvas-selection-overlay";

const CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH = 220;
const CRYSTAL_RIGHT_SIDEBAR_MAX_WIDTH = 420;
const CRYSTAL_MIN_CANVAS_WIDTH = 560;
const CRYSTAL_DIAGNOSTICS_PANEL_MIN_HEIGHT = 180;
const CRYSTAL_DIAGNOSTICS_PANEL_MAX_HEIGHT = 420;
const CRYSTAL_DIAGNOSTICS_PANEL_VIEWPORT_OFFSET = 64;
const CRYSTAL_RESIZE_KEYBOARD_STEP = 12;

interface CrystalWorkspaceResizeSession {
  readonly pointerId: number;
  readonly kind: "right" | "diagnostics";
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
  const diagnosticsToggle = document.querySelector<HTMLButtonElement>("[data-crystal-diagnostics-toggle]");
  const diagnosticsClose = document.querySelector<HTMLButtonElement>("[data-crystal-diagnostics-close]");
  const diagnosticsPopover = document.querySelector<HTMLElement>("[data-crystal-diagnostics-popover]");
  const diagnosticsResizer = document.querySelector<HTMLElement>("[data-crystal-diagnostics-resizer]");
  if (!workspace || !rightResizer || !diagnosticsToggle || !diagnosticsClose || !diagnosticsPopover || !diagnosticsResizer) return;

  const cleanup: Array<() => void> = [];
  let rightWidth = readPixelCustomProperty(workspace, "--crystal-right-sidebar-width", 284);
  let diagnosticsHeight = readPixelCustomProperty(workspace, "--crystal-diagnostics-panel-height", 360);
  let resizeSession: CrystalWorkspaceResizeSession | null = null;
  let diagnosticsOpen = !diagnosticsPopover.hidden;

  const getMaxRightWidth = (): number => Math.max(CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, Math.min(CRYSTAL_RIGHT_SIDEBAR_MAX_WIDTH, workspace.getBoundingClientRect().width - CRYSTAL_MIN_CANVAS_WIDTH));
  const getMaxDiagnosticsHeight = (): number => Math.max(CRYSTAL_DIAGNOSTICS_PANEL_MIN_HEIGHT, Math.min(CRYSTAL_DIAGNOSTICS_PANEL_MAX_HEIGHT, workspace.getBoundingClientRect().height - CRYSTAL_DIAGNOSTICS_PANEL_VIEWPORT_OFFSET));

  const setRightWidth = (nextWidth: number): void => {
    rightWidth = clampResizeValue(nextWidth, CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, getMaxRightWidth());
    workspace.style.setProperty("--crystal-right-sidebar-width", `${Math.round(rightWidth)}px`);
    syncSeparatorValue(rightResizer, CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, getMaxRightWidth(), rightWidth);
  };

  const setDiagnosticsHeight = (nextHeight: number): void => {
    diagnosticsHeight = clampResizeValue(nextHeight, CRYSTAL_DIAGNOSTICS_PANEL_MIN_HEIGHT, getMaxDiagnosticsHeight());
    workspace.style.setProperty("--crystal-diagnostics-panel-height", `${Math.round(diagnosticsHeight)}px`);
    syncSeparatorValue(diagnosticsResizer, CRYSTAL_DIAGNOSTICS_PANEL_MIN_HEIGHT, getMaxDiagnosticsHeight(), diagnosticsHeight);
  };

  const setDiagnosticsOpen = (isOpen: boolean): void => {
    diagnosticsOpen = isOpen;
    diagnosticsPopover.hidden = !isOpen;
    diagnosticsToggle.setAttribute("aria-expanded", String(isOpen));
    workspace.classList.toggle("crystal-design-view__workspace--diagnostics-open", isOpen);
    if (isOpen) setDiagnosticsHeight(diagnosticsHeight);
  };

  const startResize = (event: PointerEvent, kind: CrystalWorkspaceResizeSession["kind"], startValue: number): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeSession = { pointerId: event.pointerId, kind, startClientX: event.clientX, startClientY: event.clientY, startValue };
    const handle = kind === "right" ? rightResizer : diagnosticsResizer;
    handle.setPointerCapture(event.pointerId);
    workspace.classList.toggle("crystal-design-view__workspace--resizing-right", kind === "right");
    workspace.classList.toggle("crystal-design-view__workspace--resizing-diagnostics", kind === "diagnostics");
  };

  const handleRightPointerDown = (event: PointerEvent): void => startResize(event, "right", rightWidth);
  const handleDiagnosticsPointerDown = (event: PointerEvent): void => startResize(event, "diagnostics", diagnosticsHeight);

  const handlePointerMove = (event: PointerEvent): void => {
    if (!resizeSession || resizeSession.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (resizeSession.kind === "right") {
      setRightWidth(resizeSession.startValue - (event.clientX - resizeSession.startClientX));
      return;
    }
    setDiagnosticsHeight(resizeSession.startValue - (event.clientY - resizeSession.startClientY));
  };

  const finishResize = (event: PointerEvent): void => {
    if (!resizeSession || resizeSession.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const handle = resizeSession.kind === "right" ? rightResizer : diagnosticsResizer;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    resizeSession = null;
    workspace.classList.remove("crystal-design-view__workspace--resizing-right", "crystal-design-view__workspace--resizing-diagnostics");
  };

  const handleRightKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    setRightWidth(rightWidth + direction * CRYSTAL_RESIZE_KEYBOARD_STEP);
  };

  const handleDiagnosticsKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? 1 : -1;
    setDiagnosticsHeight(diagnosticsHeight + direction * CRYSTAL_RESIZE_KEYBOARD_STEP);
  };

  const handleToggleDiagnostics = (): void => setDiagnosticsOpen(!diagnosticsOpen);
  const handleCloseDiagnostics = (): void => {
    setDiagnosticsOpen(false);
    diagnosticsToggle.focus({ preventScroll: true });
  };

  const handleDocumentKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !diagnosticsOpen) return;
    const target = event.target;
    if (target === diagnosticsToggle || target instanceof Node && diagnosticsPopover.contains(target)) {
      event.preventDefault();
      handleCloseDiagnostics();
    }
  };

  const handleWindowResize = (): void => {
    setRightWidth(rightWidth);
    setDiagnosticsHeight(diagnosticsHeight);
  };

  setRightWidth(rightWidth);
  setDiagnosticsHeight(diagnosticsHeight);
  setDiagnosticsOpen(diagnosticsOpen);

  diagnosticsToggle.addEventListener("click", handleToggleDiagnostics);
  diagnosticsClose.addEventListener("click", handleCloseDiagnostics);
  rightResizer.addEventListener("pointerdown", handleRightPointerDown);
  diagnosticsResizer.addEventListener("pointerdown", handleDiagnosticsPointerDown);
  rightResizer.addEventListener("pointermove", handlePointerMove);
  diagnosticsResizer.addEventListener("pointermove", handlePointerMove);
  rightResizer.addEventListener("pointerup", finishResize);
  diagnosticsResizer.addEventListener("pointerup", finishResize);
  rightResizer.addEventListener("pointercancel", finishResize);
  diagnosticsResizer.addEventListener("pointercancel", finishResize);
  rightResizer.addEventListener("keydown", handleRightKeyDown);
  diagnosticsResizer.addEventListener("keydown", handleDiagnosticsKeyDown);
  document.addEventListener("keydown", handleDocumentKeyDown);
  window.addEventListener("resize", handleWindowResize);

  cleanup.push(() => diagnosticsToggle.removeEventListener("click", handleToggleDiagnostics));
  cleanup.push(() => diagnosticsClose.removeEventListener("click", handleCloseDiagnostics));
  cleanup.push(() => rightResizer.removeEventListener("pointerdown", handleRightPointerDown));
  cleanup.push(() => diagnosticsResizer.removeEventListener("pointerdown", handleDiagnosticsPointerDown));
  cleanup.push(() => rightResizer.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => diagnosticsResizer.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => rightResizer.removeEventListener("pointerup", finishResize));
  cleanup.push(() => diagnosticsResizer.removeEventListener("pointerup", finishResize));
  cleanup.push(() => rightResizer.removeEventListener("pointercancel", finishResize));
  cleanup.push(() => diagnosticsResizer.removeEventListener("pointercancel", finishResize));
  cleanup.push(() => rightResizer.removeEventListener("keydown", handleRightKeyDown));
  cleanup.push(() => diagnosticsResizer.removeEventListener("keydown", handleDiagnosticsKeyDown));
  cleanup.push(() => document.removeEventListener("keydown", handleDocumentKeyDown));
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
