import type { ProjectPreviewSelectedNode } from "../../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import { validateProjectPreviewSelectedNodePayload } from "../../../../../../../packages/core/project/preview-selection/project-preview-selection-validators";

const previewSelectionMessages = {
  enable: "crystal:preview-selection:enable",
  disable: "crystal:preview-selection:disable",
  clear: "crystal:preview-selection:clear",
  selected: "crystal:preview-selection:selected"
} as const;

export interface ProjectPreviewSelectionMessageBridge {
  readonly enable: () => void;
  readonly disable: () => void;
  readonly clear: () => void;
  readonly destroy: () => void;
}

export interface ProjectPreviewSelectionMessageBridgeOptions {
  readonly frame: HTMLIFrameElement;
  readonly onSelectedNode: (selectedNode: ProjectPreviewSelectedNode) => void;
  readonly onInvalidPayload: () => void;
}

export function createProjectPreviewSelectionMessageBridge(options: ProjectPreviewSelectionMessageBridgeOptions): ProjectPreviewSelectionMessageBridge {
  let destroyed = false;

  const handleMessage = (event: MessageEvent): void => {
    const frameWindow = options.frame.contentWindow;
    if (!frameWindow || event.source !== frameWindow) return;
    if (!isRecord(event.data) || event.data.type !== previewSelectionMessages.selected) return;

    const validation = validateProjectPreviewSelectedNodePayload(event.data.payload);
    if (!validation.ok || !validation.selectedNode) {
      options.onInvalidPayload();
      return;
    }

    options.onSelectedNode(validation.selectedNode);
  };

  window.addEventListener("message", handleMessage);

  return {
    enable: () => postFrameMessage(options.frame, previewSelectionMessages.enable),
    disable: () => postFrameMessage(options.frame, previewSelectionMessages.disable),
    clear: () => postFrameMessage(options.frame, previewSelectionMessages.clear),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      postFrameMessage(options.frame, previewSelectionMessages.disable);
      window.removeEventListener("message", handleMessage);
    }
  };
}

function postFrameMessage(frame: HTMLIFrameElement, type: string): void {
  const frameWindow = frame.contentWindow;
  if (!frameWindow) return;
  frameWindow.postMessage({ type }, "*");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
