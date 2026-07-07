import type { ProjectPreviewSelectionState, ProjectPreviewSelectionRect } from "../../preview-selection/project-preview-selection.types";
import type { ProjectDesignCanvasSelectionOverlayProjection, ProjectDesignCanvasSelectionOverlayState, ProjectDesignCanvasSelectionOverlayStatus } from "./project-design-canvas-selection-overlay.types";

export interface ProjectDesignCanvasSelectionOverlayInput {
  readonly enabled: boolean;
  readonly previewSelection: ProjectPreviewSelectionState;
}

export function selectProjectDesignCanvasSelectionOverlayState(input: ProjectDesignCanvasSelectionOverlayInput): ProjectDesignCanvasSelectionOverlayState {
  if (!input.enabled) return createOverlayState(input.enabled, input.previewSelection, "hidden", "Selection overlay disabled.", null, null);

  const selectedNode = input.previewSelection.selectedNode;
  if (!selectedNode) return createOverlayState(input.enabled, input.previewSelection, "hidden", "No Preview selection.", null, null);

  if (input.previewSelection.mappingStatus === "missing-snapshot") return createOverlayState(input.enabled, input.previewSelection, "missing-snapshot", "Build DOM Snapshot before trusting the selection overlay.", null, null);
  if (input.previewSelection.mappingStatus === "stale") return createOverlayState(input.enabled, input.previewSelection, "stale", "DOM Snapshot is stale; rebuild before showing a trusted overlay.", null, null);
  if (input.previewSelection.mappingStatus === "ambiguous") return createOverlayState(input.enabled, input.previewSelection, "ambiguous", "Selection mapping is ambiguous; overlay highlight is hidden.", null, null);

  if (input.previewSelection.mappingStatus !== "matched") return createOverlayState(input.enabled, input.previewSelection, "unavailable", input.previewSelection.mappingReason ?? "Selection is not matched to a trusted DOM Snapshot node.", null, null);

  const selectionRect = selectedNode.selectionRect;
  if (!isProjectPreviewSelectionRectReliable(selectionRect)) return createOverlayState(input.enabled, input.previewSelection, "unavailable", "Selection rect unavailable or not reliable.", null, null);

  return createOverlayState(input.enabled, input.previewSelection, "matched", "Selection matched.", selectionRect, projectPreviewSelectionRectToDesignCanvasOverlayProjection(selectionRect));
}

export function projectPreviewSelectionRectToDesignCanvasOverlayProjection(rect: ProjectPreviewSelectionRect): ProjectDesignCanvasSelectionOverlayProjection {
  return {
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height
  };
}

export function isProjectPreviewSelectionRectReliable(rect: ProjectPreviewSelectionRect | null): rect is ProjectPreviewSelectionRect {
  return !!rect
    && rect.coordinateSpace === "iframe-viewport"
    && isFiniteOverlayNumber(rect.x)
    && isFiniteOverlayNumber(rect.y)
    && isFiniteOverlayNumber(rect.width)
    && isFiniteOverlayNumber(rect.height)
    && rect.width > 0
    && rect.height > 0;
}

function createOverlayState(enabled: boolean, previewSelection: ProjectPreviewSelectionState, status: ProjectDesignCanvasSelectionOverlayStatus, message: string, rect: ProjectPreviewSelectionRect | null, projection: ProjectDesignCanvasSelectionOverlayProjection | null): ProjectDesignCanvasSelectionOverlayState {
  return {
    enabled,
    status,
    message,
    mappingStatus: previewSelection.mappingStatus,
    snapshotPath: previewSelection.selectedNode?.snapshotPath ?? null,
    rect,
    projection
  };
}

function isFiniteOverlayNumber(value: number): boolean {
  return Number.isFinite(value);
}
