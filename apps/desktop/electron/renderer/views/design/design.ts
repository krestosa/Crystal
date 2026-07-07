import { initializeProjectDesignCanvas } from "../../components/design-canvas/project-design-canvas";

export function initializeDesignView(): void {
  document.querySelector<HTMLElement>('[data-crystal-view="design"]')?.setAttribute("data-ready", "true");
  initializeProjectDesignCanvas();
}
