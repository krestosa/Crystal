import { selectProjectDesignCanvasSelectionOverlayState } from "../../../../../../../packages/core/project/design-canvas/selection-overlay/project-design-canvas-selection-overlay";
import type { ProjectDesignCanvasSelectionOverlayStatus } from "../../../../../../../packages/core/project/design-canvas/selection-overlay/project-design-canvas-selection-overlay.types";
import type { ProjectPreviewSelectionState } from "../../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import type { ProjectDesignCanvasSelectionOverlayElements } from "./project-design-canvas-selection-overlay.types";

let activeProjectDesignCanvasSelectionOverlayCleanup: (() => void) | null = null;
let sessionSelectionOverlayEnabled = true;

export function initializeProjectDesignCanvasSelectionOverlay(): void {
  activeProjectDesignCanvasSelectionOverlayCleanup?.();

  const root = document.querySelector<HTMLElement>("[data-project-design-canvas]");
  if (!root) return;

  const elements = getProjectDesignCanvasSelectionOverlayElements(root);
  const cleanup: Array<() => void> = [];
  let latestPreviewSelectionState: ProjectPreviewSelectionState | null = null;
  let overlayEnabled = sessionSelectionOverlayEnabled;

  const render = (): void => {
    elements.toggleButton.textContent = overlayEnabled ? "Overlay On" : "Overlay Off";
    elements.toggleButton.setAttribute("aria-pressed", String(overlayEnabled));

    if (!latestPreviewSelectionState) {
      renderHiddenOverlay(elements, "hidden");
      return;
    }

    const overlayState = selectProjectDesignCanvasSelectionOverlayState({ enabled: overlayEnabled, previewSelection: latestPreviewSelectionState });
    setOverlayStatus(elements, overlayState.status);

    if (overlayState.status === "hidden") {
      renderHiddenOverlay(elements, overlayState.status);
      return;
    }

    elements.overlay.hidden = false;
    elements.overlay.setAttribute("aria-hidden", "true");

    if (overlayState.status === "matched" && overlayState.projection) {
      elements.box.hidden = false;
      elements.box.style.transform = `translate(${overlayState.projection.left}px, ${overlayState.projection.top}px)`;
      elements.box.style.width = `${overlayState.projection.width}px`;
      elements.box.style.height = `${overlayState.projection.height}px`;
      elements.message.hidden = true;
      elements.message.textContent = "";
      return;
    }

    clearSelectionBox(elements);
    elements.message.hidden = false;
    elements.message.textContent = overlayState.message;
  };

  const handleToggleOverlay = (): void => {
    overlayEnabled = !overlayEnabled;
    sessionSelectionOverlayEnabled = overlayEnabled;
    render();
  };

  elements.toggleButton.addEventListener("click", handleToggleOverlay);
  cleanup.push(() => elements.toggleButton.removeEventListener("click", handleToggleOverlay));
  cleanup.push(window.crystal.project.onPreviewSelectionStateChanged((state) => {
    latestPreviewSelectionState = state;
    render();
  }));

  activeProjectDesignCanvasSelectionOverlayCleanup = () => {
    for (const destroy of cleanup.splice(0).reverse()) destroy();
    activeProjectDesignCanvasSelectionOverlayCleanup = null;
  };

  render();
  void window.crystal.project.getPreviewSelectionState().then((state) => {
    latestPreviewSelectionState = state;
    render();
  }).catch(() => renderHiddenOverlay(elements, "unavailable"));
}

function getProjectDesignCanvasSelectionOverlayElements(root: HTMLElement): ProjectDesignCanvasSelectionOverlayElements {
  return {
    root,
    overlay: querySelectionOverlayElement(root, "[data-project-design-canvas-selection-overlay]", HTMLElement),
    box: querySelectionOverlayElement(root, "[data-project-design-canvas-selection-box]", HTMLElement),
    message: querySelectionOverlayElement(root, "[data-project-design-canvas-selection-message]", HTMLElement),
    toggleButton: querySelectionOverlayElement(root, "[data-project-design-canvas-selection-overlay-toggle]", HTMLButtonElement)
  };
}

function querySelectionOverlayElement<TElement extends HTMLElement>(root: HTMLElement, selector: string, elementType: new () => TElement): TElement {
  const element = root.querySelector(selector);
  if (!(element instanceof elementType)) throw new Error(`Missing Design Canvas selection overlay element: ${selector}`);
  return element;
}

function renderHiddenOverlay(elements: ProjectDesignCanvasSelectionOverlayElements, status: ProjectDesignCanvasSelectionOverlayStatus): void {
  setOverlayStatus(elements, status);
  elements.overlay.hidden = true;
  elements.message.hidden = true;
  elements.message.textContent = "";
  clearSelectionBox(elements);
}

function clearSelectionBox(elements: ProjectDesignCanvasSelectionOverlayElements): void {
  elements.box.hidden = true;
  elements.box.style.transform = "";
  elements.box.style.width = "";
  elements.box.style.height = "";
}

function setOverlayStatus(elements: ProjectDesignCanvasSelectionOverlayElements, status: ProjectDesignCanvasSelectionOverlayStatus): void {
  elements.root.setAttribute("data-project-design-canvas-selection-overlay-status", status);
  elements.overlay.setAttribute("data-project-design-canvas-selection-overlay-status", status);
}
