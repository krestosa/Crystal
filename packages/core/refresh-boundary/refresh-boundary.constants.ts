export const REFRESH_BOUNDARY_PLANNED_STATUS = "planned" as const;
export const REFRESH_BOUNDARY_BLOCKED_STATUS = "blocked" as const;
export const REFRESH_BOUNDARY_UNSUPPORTED_STATUS = "unsupported" as const;

export const REFRESH_INVALIDATE_PROJECT_GRAPH = "project-graph" as const;
export const REFRESH_INVALIDATE_DOM_SNAPSHOT = "dom-snapshot" as const;
export const REFRESH_INVALIDATE_PREVIEW_RENDER = "preview-render" as const;
export const REFRESH_INVALIDATE_SELECTION_STATE = "selection-state" as const;
export const REFRESH_INVALIDATE_INSPECTOR_STATE = "inspector-state" as const;
export const REFRESH_INVALIDATE_VISUAL_OVERLAY = "visual-overlay" as const;
export const REFRESH_INVALIDATE_DIAGNOSTICS = "diagnostics" as const;

export const DEFAULT_SOURCE_PATCH_REFRESH_INVALIDATIONS = [
  REFRESH_INVALIDATE_PROJECT_GRAPH,
  REFRESH_INVALIDATE_DOM_SNAPSHOT,
  REFRESH_INVALIDATE_PREVIEW_RENDER,
  REFRESH_INVALIDATE_SELECTION_STATE,
  REFRESH_INVALIDATE_INSPECTOR_STATE,
  REFRESH_INVALIDATE_VISUAL_OVERLAY,
  REFRESH_INVALIDATE_DIAGNOSTICS
] as const;

export const REFRESH_BOUNDARY_PREVIEW_SAFETY_NOTE =
  "Refresh boundary plans describe future invalidation only; they do not reload Preview or mutate derived state.";
