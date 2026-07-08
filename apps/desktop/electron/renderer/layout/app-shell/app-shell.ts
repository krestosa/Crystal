const CRYSTAL_LEFT_SIDEBAR_MIN_WIDTH = 176;
const CRYSTAL_LEFT_SIDEBAR_MAX_WIDTH = 360;
const CRYSTAL_MIN_WORKBENCH_WIDTH = 520;
const CRYSTAL_RESIZE_KEYBOARD_STEP = 12;

interface CrystalAppShellResizeSession {
  readonly pointerId: number;
  readonly startClientX: number;
  readonly startWidth: number;
}

let activeAppShellResizeCleanup: (() => void) | null = null;

export function initializeAppShell(): void {
  const shell = document.querySelector<HTMLElement>("[data-crystal-app-shell]");
  shell?.setAttribute("data-ready", "true");
  initializeDevToolsControl();
  if (shell) initializeAppShellResize(shell);
}

function initializeDevToolsControl(): void {
  const button = document.querySelector<HTMLButtonElement>("[data-crystal-devtools-toggle]");
  if (!button) return;

  const handleClick = (): void => {
    void window.crystal.app.openDevTools().catch((error: unknown) => {
      console.error("Crystal DevTools launch failed", error);
    });
  };

  button.addEventListener("click", handleClick);
}

function initializeAppShellResize(shell: HTMLElement): void {
  activeAppShellResizeCleanup?.();

  const body = shell.querySelector<HTMLElement>("[data-crystal-app-shell-body]");
  const leftResizer = shell.querySelector<HTMLElement>("[data-crystal-left-sidebar-resizer]");
  if (!body || !leftResizer) return;

  const cleanup: Array<() => void> = [];
  let leftWidth = CRYSTAL_LEFT_SIDEBAR_MIN_WIDTH;
  let resizeSession: CrystalAppShellResizeSession | null = null;

  const getMaxLeftWidth = (): number => Math.max(CRYSTAL_LEFT_SIDEBAR_MIN_WIDTH, Math.min(CRYSTAL_LEFT_SIDEBAR_MAX_WIDTH, body.getBoundingClientRect().width - CRYSTAL_MIN_WORKBENCH_WIDTH));
  const setLeftWidth = (nextWidth: number): void => {
    leftWidth = clampResizeValue(nextWidth, CRYSTAL_LEFT_SIDEBAR_MIN_WIDTH, getMaxLeftWidth());
    body.style.setProperty("--crystal-left-sidebar-width", `${Math.round(leftWidth)}px`);
    leftResizer.setAttribute("aria-valuemin", String(CRYSTAL_LEFT_SIDEBAR_MIN_WIDTH));
    leftResizer.setAttribute("aria-valuemax", String(Math.round(getMaxLeftWidth())));
    leftResizer.setAttribute("aria-valuenow", String(Math.round(leftWidth)));
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeSession = { pointerId: event.pointerId, startClientX: event.clientX, startWidth: leftWidth };
    leftResizer.setPointerCapture(event.pointerId);
    body.classList.add("crystal-app-shell__body--resizing-left");
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!resizeSession || resizeSession.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setLeftWidth(resizeSession.startWidth + event.clientX - resizeSession.startClientX);
  };

  const finishResize = (event: PointerEvent): void => {
    if (!resizeSession || resizeSession.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (leftResizer.hasPointerCapture(event.pointerId)) leftResizer.releasePointerCapture(event.pointerId);
    resizeSession = null;
    body.classList.remove("crystal-app-shell__body--resizing-left");
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    setLeftWidth(leftWidth + direction * CRYSTAL_RESIZE_KEYBOARD_STEP);
  };

  const handleWindowResize = (): void => setLeftWidth(leftWidth);

  leftWidth = readPixelCustomProperty(body, "--crystal-left-sidebar-width", 232);
  setLeftWidth(leftWidth);

  leftResizer.addEventListener("pointerdown", handlePointerDown);
  leftResizer.addEventListener("pointermove", handlePointerMove);
  leftResizer.addEventListener("pointerup", finishResize);
  leftResizer.addEventListener("pointercancel", finishResize);
  leftResizer.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", handleWindowResize);

  cleanup.push(() => leftResizer.removeEventListener("pointerdown", handlePointerDown));
  cleanup.push(() => leftResizer.removeEventListener("pointermove", handlePointerMove));
  cleanup.push(() => leftResizer.removeEventListener("pointerup", finishResize));
  cleanup.push(() => leftResizer.removeEventListener("pointercancel", finishResize));
  cleanup.push(() => leftResizer.removeEventListener("keydown", handleKeyDown));
  cleanup.push(() => window.removeEventListener("resize", handleWindowResize));

  activeAppShellResizeCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeAppShellResizeCleanup = null;
  };
}

function readPixelCustomProperty(element: HTMLElement, propertyName: string, fallback: number): number {
  const value = Number.parseFloat(element.style.getPropertyValue(propertyName));
  return Number.isFinite(value) ? value : fallback;
}

function clampResizeValue(value: number, min: number, max: number): number {
  const safeMax = Math.max(min, max);
  return Math.min(Math.max(value, min), safeMax);
}
