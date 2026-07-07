import { initializeProjectDesignCanvas } from "../../components/design-canvas/project-design-canvas";
import { initializeProjectDesignCanvasSelectionOverlay } from "../../components/design-canvas/selection-overlay/project-design-canvas-selection-overlay";

export function initializeDesignView(): void {
  const view = document.querySelector<HTMLElement>('[data-crystal-view="design"]');
  view?.setAttribute("data-ready", "true");
  initializeProjectDesignCanvas();
  initializeProjectDesignCanvasSelectionOverlay();
  initializeWorkspaceShellState();
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
