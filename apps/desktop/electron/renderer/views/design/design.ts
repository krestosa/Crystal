import { initializeProjectDesignCanvas } from "../../components/design-canvas/project-design-canvas";
import { initializeProjectDesignCanvasSelectionOverlay } from "../../components/design-canvas/selection-overlay/project-design-canvas-selection-overlay";

const CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH = 220;
const CRYSTAL_RIGHT_SIDEBAR_MAX_WIDTH = 420;
const CRYSTAL_MIN_CANVAS_WIDTH = 560;
const CRYSTAL_DIAGNOSTICS_PANEL_MIN_WIDTH = 360;
const CRYSTAL_DIAGNOSTICS_PANEL_MIN_HEIGHT = 220;
const CRYSTAL_DIAGNOSTICS_PANEL_MAX_WIDTH = 920;
const CRYSTAL_DIAGNOSTICS_PANEL_MAX_HEIGHT = 520;
const CRYSTAL_DIAGNOSTICS_PANEL_MARGIN = 12;
const CRYSTAL_DIAGNOSTICS_PINNED_BOTTOM = 48;
const CRYSTAL_RESIZE_KEYBOARD_STEP = 12;

type CrystalWorkspaceInteractionKind = "right-resize" | "diagnostics-drag" | "diagnostics-resize-top-left" | "diagnostics-resize-top-right" | "diagnostics-resize-bottom-left" | "diagnostics-resize-bottom-right";

interface CrystalWorkspaceInteractionSession {
  readonly pointerId: number;
  readonly kind: CrystalWorkspaceInteractionKind;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startWidth: number;
  readonly startHeight: number;
  readonly startLeft: number;
  readonly startTop: number;
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
  const diagnosticsPin = document.querySelector<HTMLButtonElement>("[data-crystal-diagnostics-pin]");
  const diagnosticsPopover = document.querySelector<HTMLElement>("[data-crystal-diagnostics-popover]");
  const diagnosticsDragHandle = document.querySelector<HTMLElement>("[data-crystal-diagnostics-drag-handle]");
  const diagnosticsResizeTopLeft = document.querySelector<HTMLElement>("[data-crystal-diagnostics-resize-top-left]");
  const diagnosticsResizeTopRight = document.querySelector<HTMLElement>("[data-crystal-diagnostics-resize-top-right]");
  const diagnosticsResizeBottomLeft = document.querySelector<HTMLElement>("[data-crystal-diagnostics-resize-bottom-left]");
  const diagnosticsResizeBottomRight = document.querySelector<HTMLElement>("[data-crystal-diagnostics-resize-bottom-right]");
  if (!workspace || !rightResizer || !diagnosticsToggle || !diagnosticsClose || !diagnosticsPin || !diagnosticsPopover || !diagnosticsDragHandle || !diagnosticsResizeTopLeft || !diagnosticsResizeTopRight || !diagnosticsResizeBottomLeft || !diagnosticsResizeBottomRight) return;

  const cleanup: Array<() => void> = [];
  const diagnosticsResizeHandles = [diagnosticsResizeTopLeft, diagnosticsResizeTopRight, diagnosticsResizeBottomLeft, diagnosticsResizeBottomRight];
  let rightWidth = readPixelCustomProperty(workspace, "--crystal-right-sidebar-width", 284);
  let diagnosticsOpen = !diagnosticsPopover.hidden;
  let diagnosticsPinned = diagnosticsPopover.getAttribute("data-crystal-diagnostics-pinned") !== "false";
  let diagnosticsWidth = readPixelCustomProperty(workspace, "--crystal-diagnostics-panel-width", 760);
  let diagnosticsHeight = readPixelCustomProperty(workspace, "--crystal-diagnostics-panel-height", 360);
  let diagnosticsLeft = readPixelCustomProperty(workspace, "--crystal-diagnostics-panel-left", CRYSTAL_DIAGNOSTICS_PANEL_MARGIN);
  let diagnosticsTop = readPixelCustomProperty(workspace, "--crystal-diagnostics-panel-top", CRYSTAL_DIAGNOSTICS_PANEL_MARGIN);
  let interactionSession: CrystalWorkspaceInteractionSession | null = null;

  const getMaxRightWidth = (): number => Math.max(CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, Math.min(CRYSTAL_RIGHT_SIDEBAR_MAX_WIDTH, workspace.getBoundingClientRect().width - CRYSTAL_MIN_CANVAS_WIDTH));
  const getMaxDiagnosticsWidth = (): number => Math.max(240, Math.min(CRYSTAL_DIAGNOSTICS_PANEL_MAX_WIDTH, workspace.getBoundingClientRect().width - CRYSTAL_DIAGNOSTICS_PANEL_MARGIN * 2));
  const getMaxDiagnosticsHeight = (): number => Math.max(180, Math.min(CRYSTAL_DIAGNOSTICS_PANEL_MAX_HEIGHT, workspace.getBoundingClientRect().height - CRYSTAL_DIAGNOSTICS_PANEL_MARGIN - CRYSTAL_DIAGNOSTICS_PINNED_BOTTOM));

  const setRightWidth = (nextWidth: number): void => {
    rightWidth = clampResizeValue(nextWidth, CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, getMaxRightWidth());
    workspace.style.setProperty("--crystal-right-sidebar-width", `${Math.round(rightWidth)}px`);
    syncSeparatorValue(rightResizer, CRYSTAL_RIGHT_SIDEBAR_MIN_WIDTH, getMaxRightWidth(), rightWidth);
  };

  const setDiagnosticsPosition = (nextLeft: number, nextTop: number): void => {
    const workspaceRect = workspace.getBoundingClientRect();
    const maxLeft = Math.max(CRYSTAL_DIAGNOSTICS_PANEL_MARGIN, workspaceRect.width - diagnosticsWidth - CRYSTAL_DIAGNOSTICS_PANEL_MARGIN);
    const maxTop = Math.max(CRYSTAL_DIAGNOSTICS_PANEL_MARGIN, workspaceRect.height - diagnosticsHeight - CRYSTAL_DIAGNOSTICS_PANEL_MARGIN);
    diagnosticsLeft = clampResizeValue(nextLeft, CRYSTAL_DIAGNOSTICS_PANEL_MARGIN, maxLeft);
    diagnosticsTop = clampResizeValue(nextTop, CRYSTAL_DIAGNOSTICS_PANEL_MARGIN, maxTop);
    workspace.style.setProperty("--crystal-diagnostics-panel-left", `${Math.round(diagnosticsLeft)}px`);
    workspace.style.setProperty("--crystal-diagnostics-panel-top", `${Math.round(diagnosticsTop)}px`);
  };

  const setDiagnosticsBox = (nextWidth: number, nextHeight: number, nextLeft = diagnosticsLeft, nextTop = diagnosticsTop): void => {
    diagnosticsWidth = clampResizeValue(nextWidth, CRYSTAL_DIAGNOSTICS_PANEL_MIN_WIDTH, getMaxDiagnosticsWidth());
    diagnosticsHeight = clampResizeValue(nextHeight, CRYSTAL_DIAGNOSTICS_PANEL_MIN_HEIGHT, getMaxDiagnosticsHeight());
    workspace.style.setProperty("--crystal-diagnostics-panel-width", `${Math.round(diagnosticsWidth)}px`);
    workspace.style.setProperty("--crystal-diagnostics-panel-height", `${Math.round(diagnosticsHeight)}px`);
    for (const handle of diagnosticsResizeHandles) syncSeparatorValue(handle, CRYSTAL_DIAGNOSTICS_PANEL_MIN_WIDTH, getMaxDiagnosticsWidth(), diagnosticsWidth);
    if (!diagnosticsPinned) setDiagnosticsPosition(nextLeft, nextTop);
  };

  const captureCurrentDiagnosticsPosition = (): void => {
    if (diagnosticsPopover.hidden) return;
    const workspaceRect = workspace.getBoundingClientRect();
    const popoverRect = diagnosticsPopover.getBoundingClientRect();
    setDiagnosticsPosition(popoverRect.left - workspaceRect.left, popoverRect.top - workspaceRect.top);
  };

  const setDiagnosticsPinned = (isPinned: boolean): void => {
    if (!isPinned && diagnosticsPinned) captureCurrentDiagnosticsPosition();
    diagnosticsPinned = isPinned;
    diagnosticsPopover.setAttribute("data-crystal-diagnostics-pinned", String(isPinned));
    diagnosticsPin.setAttribute("aria-pressed", String(isPinned));
    diagnosticsPin.textContent = isPinned ? "Pinned" : "Unpinned";
    if (!isPinned) setDiagnosticsPosition(diagnosticsLeft, diagnosticsTop);
  };

  const setDiagnosticsOpen = (isOpen: boolean): void => {
    diagnosticsOpen = isOpen;
    diagnosticsPopover.hidden = !isOpen;
    diagnosticsToggle.setAttribute("aria-expanded", String(isOpen));
    workspace.classList.toggle("crystal-design-view__workspace--diagnostics-open", isOpen);
    if (!isOpen) return;
    setDiagnosticsBox(diagnosticsWidth, diagnosticsHeight);
    if (!diagnosticsPinned) setDiagnosticsPosition(diagnosticsLeft, diagnosticsTop);
  };

  const startInteraction = (event: PointerEvent, kind: CrystalWorkspaceInteractionKind): void => {
    if (event.button !== 0) return;
    if (kind === "diagnostics-drag" && (diagnosticsPinned || isInteractiveDiagnosticsTarget(event.target))) return;
    event.preventDefault();
    event.stopPropagation();
    interactionSession = {
      pointerId: event.pointerId,
      kind,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: kind === "right-resize" ? rightWidth : diagnosticsWidth,
      startHeight: diagnosticsHeight,
      startLeft: diagnosticsLeft,
      startTop: diagnosticsTop
    };
    const handle = getInteractionHandle(kind, rightResizer, diagnosticsDragHandle, diagnosticsResizeTopLeft, diagnosticsResizeTopRight, diagnosticsResizeBottomLeft, diagnosticsResizeBottomRight);
    handle.setPointerCapture(event.pointerId);
    workspace.classList.toggle("crystal-design-view__workspace--resizing-right", kind === "right-resize");
    workspace.classList.toggle("crystal-design-view__workspace--resizing-diagnostics", kind.startsWith("diagnostics-resize"));
    workspace.classList.toggle("crystal-design-view__workspace--dragging-diagnostics", kind === "diagnostics-drag");
  };

  const handleRightPointerDown = (event: PointerEvent): void => startInteraction(event, "right-resize");
  const handleDiagnosticsDragPointerDown = (event: PointerEvent): void => startInteraction(event, "diagnostics-drag");
  const handleDiagnosticsTopLeftPointerDown = (event: PointerEvent): void => startInteraction(event, "diagnostics-resize-top-left");
  const handleDiagnosticsTopRightPointerDown = (event: PointerEvent): void => startInteraction(event, "diagnostics-resize-top-right");
  const handleDiagnosticsBottomLeftPointerDown = (event: PointerEvent): void => startInteraction(event, "diagnostics-resize-bottom-left");
  const handleDiagnosticsBottomRightPointerDown = (event: PointerEvent): void => startInteraction(event, "diagnostics-resize-bottom-right");

  const handlePointerMove = (event: PointerEvent): void => {
    if (!interactionSession || interactionSession.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - interactionSession.startClientX;
    const deltaY = event.clientY - interactionSession.startClientY;
    if (interactionSession.kind === "right-resize") {
      setRightWidth(interactionSession.startWidth - deltaX);
      return;
    }
    if (interactionSession.kind === "diagnostics-drag") {
      setDiagnosticsPosition(interactionSession.startLeft + deltaX, interactionSession.startTop + deltaY);
      return;
    }
    const usesLeftEdge = interactionSession.kind === "diagnostics-resize-top-left" || interactionSession.kind === "diagnostics-resize-bottom-left";
    const usesTopEdge = interactionSession.kind === "diagnostics-resize-top-left" || interactionSession.kind === "diagnostics-resize-top-right";
    const nextWidth = interactionSession.startWidth + (usesLeftEdge ? -deltaX : deltaX);
    const nextHeight = interactionSession.startHeight + (usesTopEdge ? -deltaY : deltaY);
    const clampedWidth = clampResizeValue(nextWidth, CRYSTAL_DIAGNOSTICS_PANEL_MIN_WIDTH, getMaxDiagnosticsWidth());
    const clampedHeight = clampResizeValue(nextHeight, CRYSTAL_DIAGNOSTICS_PANEL_MIN_HEIGHT, getMaxDiagnosticsHeight());
    const nextLeft = usesLeftEdge ? interactionSession.startLeft + interactionSession.startWidth - clampedWidth : interactionSession.startLeft;
    const nextTop = usesTopEdge ? interactionSession.startTop + interactionSession.startHeight - clampedHeight : interactionSession.startTop;
    setDiagnosticsBox(clampedWidth, clampedHeight, nextLeft, nextTop);
  };

  const finishInteraction = (event: PointerEvent): void => {
    if (!interactionSession || interactionSession.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const handle = getInteractionHandle(interactionSession.kind, rightResizer, diagnosticsDragHandle, diagnosticsResizeTopLeft, diagnosticsResizeTopRight, diagnosticsResizeBottomLeft, diagnosticsResizeBottomRight);
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    interactionSession = null;
    workspace.classList.remove("crystal-design-view__workspace--resizing-right", "crystal-design-view__workspace--resizing-diagnostics", "crystal-design-view__workspace--dragging-diagnostics");
  };

  const handleRightKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? 1 : -1;
    setRightWidth(rightWidth + direction * CRYSTAL_RESIZE_KEYBOARD_STEP);
  };

  const handleDiagnosticsResizeKeyDown = (event: KeyboardEvent): void => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const nextWidth = diagnosticsWidth + (event.key === "ArrowRight" ? CRYSTAL_RESIZE_KEYBOARD_STEP : event.key === "ArrowLeft" ? -CRYSTAL_RESIZE_KEYBOARD_STEP : 0);
    const nextHeight = diagnosticsHeight + (event.key === "ArrowDown" ? CRYSTAL_RESIZE_KEYBOARD_STEP : event.key === "ArrowUp" ? -CRYSTAL_RESIZE_KEYBOARD_STEP : 0);
    setDiagnosticsBox(nextWidth, nextHeight);
  };

  const handleToggleDiagnostics = (): void => setDiagnosticsOpen(!diagnosticsOpen);
  const handleCloseDiagnostics = (): void => {
    setDiagnosticsOpen(false);
    diagnosticsToggle.focus({ preventScroll: true });
  };
  const handleTogglePinned = (): void => setDiagnosticsPinned(!diagnosticsPinned);

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
    setDiagnosticsBox(diagnosticsWidth, diagnosticsHeight);
    if (!diagnosticsPinned) setDiagnosticsPosition(diagnosticsLeft, diagnosticsTop);
  };

  setRightWidth(rightWidth);
  setDiagnosticsBox(diagnosticsWidth, diagnosticsHeight);
  setDiagnosticsPinned(diagnosticsPinned);
  setDiagnosticsOpen(diagnosticsOpen);

  diagnosticsToggle.addEventListener("click", handleToggleDiagnostics);
  diagnosticsClose.addEventListener("click", handleCloseDiagnostics);
  diagnosticsPin.addEventListener("click", handleTogglePinned);
  rightResizer.addEventListener("pointerdown", handleRightPointerDown);
  diagnosticsDragHandle.addEventListener("pointerdown", handleDiagnosticsDragPointerDown);
  diagnosticsResizeTopLeft.addEventListener("pointerdown", handleDiagnosticsTopLeftPointerDown);
  diagnosticsResizeTopRight.addEventListener("pointerdown", handleDiagnosticsTopRightPointerDown);
  diagnosticsResizeBottomLeft.addEventListener("pointerdown", handleDiagnosticsBottomLeftPointerDown);
  diagnosticsResizeBottomRight.addEventListener("pointerdown", handleDiagnosticsBottomRightPointerDown);
  rightResizer.addEventListener("pointermove", handlePointerMove);
  diagnosticsDragHandle.addEventListener("pointermove", handlePointerMove);
  for (const handle of diagnosticsResizeHandles) handle.addEventListener("pointermove", handlePointerMove);
  rightResizer.addEventListener("pointerup", finishInteraction);
  diagnosticsDragHandle.addEventListener("pointerup", finishInteraction);
  for (const handle of diagnosticsResizeHandles) handle.addEventListener("pointerup", finishInteraction);
  rightResizer.addEventListener("pointercancel", finishInteraction);
  diagnosticsDragHandle.addEventListener("pointercancel", finishInteraction);
  for (const handle of diagnosticsResizeHandles) handle.addEventListener("pointercancel", finishInteraction);
  rightResizer.addEventListener("keydown", handleRightKeyDown);
  for (const handle of diagnosticsResizeHandles) handle.addEventListener("keydown", handleDiagnosticsResizeKeyDown);
  document.addEventListener("keydown", handleDocumentKeyDown);
  window.addEventListener("resize", handleWindowResize);

  cleanup.push(() => diagnosticsToggle.removeEventListener("click", handleToggleDiagnostics));
  cleanup.push(() => diagnosticsClose.removeEventListener("click", handleCloseDiagnostics));
  cleanup.push(() => diagnosticsPin.removeEventListener("click", handleTogglePinned));
  cleanup.push(() => rightResizer.removeEventListener("pointerdown", handleRightPointerDown));
  cleanup.push(() => diagnosticsDragHandle.removeEventListener("pointerdown", handleDiagnosticsDragPointerDown));
  cleanup.push(() => diagnosticsResizeTopLeft.removeEventListener("pointerdown", handleDiagnosticsTopLeftPointerDown));
  cleanup.push(() => diagnosticsResizeTopRight.removeEventListener("pointerdown", handleDiagnosticsTopRightPointerDown));
  cleanup.push(() => diagnosticsResizeBottomLeft.removeEventListener("pointerdown", handleDiagnosticsBottomLeftPointerDown));
  cleanup.push(() => diagnosticsResizeBottomRight.removeEventListener("pointerdown", handleDiagnosticsBottomRightPointerDown));
  cleanup.push(() => rightResizer.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => diagnosticsDragHandle.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => { for (const handle of diagnosticsResizeHandles) handle.removeEventListener("pointermove", handlePointerMove); });
  cleanup.push(() => rightResizer.removeEventListener("pointerup", finishInteraction));
  cleanup.push(() => diagnosticsDragHandle.removeEventListener("pointerup", finishInteraction));
  cleanup.push(() => { for (const handle of diagnosticsResizeHandles) handle.removeEventListener("pointerup", finishInteraction); });
  cleanup.push(() => rightResizer.removeEventListener("pointercancel", finishInteraction));
  cleanup.push(() => diagnosticsDragHandle.removeEventListener("pointercancel", finishInteraction));
  cleanup.push(() => { for (const handle of diagnosticsResizeHandles) handle.removeEventListener("pointercancel", finishInteraction); });
  cleanup.push(() => rightResizer.removeEventListener("keydown", handleRightKeyDown));
  cleanup.push(() => { for (const handle of diagnosticsResizeHandles) handle.removeEventListener("keydown", handleDiagnosticsResizeKeyDown); });
  cleanup.push(() => document.removeEventListener("keydown", handleDocumentKeyDown));
  cleanup.push(() => window.removeEventListener("resize", handleWindowResize));

  activeWorkspaceResizeCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeWorkspaceResizeCleanup = null;
  };
}

function getInteractionHandle(
  kind: CrystalWorkspaceInteractionKind,
  rightResizer: HTMLElement,
  diagnosticsDragHandle: HTMLElement,
  diagnosticsResizeTopLeft: HTMLElement,
  diagnosticsResizeTopRight: HTMLElement,
  diagnosticsResizeBottomLeft: HTMLElement,
  diagnosticsResizeBottomRight: HTMLElement
): HTMLElement {
  if (kind === "right-resize") return rightResizer;
  if (kind === "diagnostics-drag") return diagnosticsDragHandle;
  if (kind === "diagnostics-resize-top-left") return diagnosticsResizeTopLeft;
  if (kind === "diagnostics-resize-top-right") return diagnosticsResizeTopRight;
  if (kind === "diagnostics-resize-bottom-left") return diagnosticsResizeBottomLeft;
  return diagnosticsResizeBottomRight;
}

function isInteractiveDiagnosticsTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button, input, select, textarea, a, summary, [role='button'], [data-crystal-diagnostics-resizer]"));
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
  const safeMax = Math.max(1, max);
  const safeMin = Math.min(min, safeMax);
  return Math.min(Math.max(value, safeMin), safeMax);
}
