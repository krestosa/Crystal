import type { ProjectPreviewSelectionMappingStatus } from "../../preview-selection/mapping/project-preview-selection-mapping.types";
import type { ProjectPreviewSelectionRect } from "../../preview-selection/project-preview-selection.types";

export type ProjectDesignCanvasSelectionOverlayStatus =
  | "hidden"
  | "matched"
  | "missing-snapshot"
  | "stale"
  | "ambiguous"
  | "unavailable";

export interface ProjectDesignCanvasSelectionOverlayProjection {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ProjectDesignCanvasSelectionOverlayState {
  readonly enabled: boolean;
  readonly status: ProjectDesignCanvasSelectionOverlayStatus;
  readonly message: string;
  readonly mappingStatus: ProjectPreviewSelectionMappingStatus;
  readonly snapshotPath: string | null;
  readonly rect: ProjectPreviewSelectionRect | null;
  readonly projection: ProjectDesignCanvasSelectionOverlayProjection | null;
}
