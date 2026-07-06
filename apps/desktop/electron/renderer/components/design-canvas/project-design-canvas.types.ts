import type { ProjectDesignCanvasBounds } from "../../../../../../packages/core/project/design-canvas/project-design-canvas-viewport";

export interface ProjectDesignCanvasElements {
  readonly root: HTMLElement;
  readonly surface: HTMLElement;
  readonly stage: HTMLElement;
  readonly pageFrame: HTMLElement;
  readonly captureLayer: HTMLElement;
  readonly zoomDisplay: HTMLElement;
  readonly fitButton: HTMLButtonElement;
  readonly centerButton: HTMLButtonElement;
  readonly resetButton: HTMLButtonElement;
}

export type ProjectDesignCanvasPanSource = "space" | "middle" | "background" | "trackpad" | "keyboard";

export interface ProjectDesignCanvasPanSession {
  readonly pointerId: number;
  readonly lastClientX: number;
  readonly lastClientY: number;
  readonly source: ProjectDesignCanvasPanSource;
}

export type ProjectDesignCanvasInteractionTarget = EventTarget | null;

export function measureProjectDesignCanvasBounds(elements: ProjectDesignCanvasElements): ProjectDesignCanvasBounds {
  const surfaceRect = elements.surface.getBoundingClientRect();
  return {
    viewportWidth: surfaceRect.width,
    viewportHeight: surfaceRect.height,
    frameWidth: elements.pageFrame.offsetWidth,
    frameHeight: elements.pageFrame.offsetHeight
  };
}
