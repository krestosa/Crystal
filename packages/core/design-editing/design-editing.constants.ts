export const DESIGN_EDITING_BLOCKED_STATUS = "blocked";
export const DESIGN_EDITING_PREVIEW_ONLY_STATUS = "preview-only";
export const DESIGN_EDITING_UNSUPPORTED_STATUS = "unsupported";

export const DESIGN_EDITING_APPLY_BLOCKED_REASON =
  "Apply is unavailable until write runtime, conflict detection, dirty-state persistence, patch application, refresh execution, and durable history are implemented.";

export const DESIGN_EDITING_PREVIEW_SAFETY_NOTE =
  "Design editing readiness is a preflight summary only; it cannot enable Apply, write files, mutate Preview DOM, persist dirty state, execute refresh, or execute undo/redo.";

export const DESIGN_EDITING_FUTURE_REQUIREMENTS = [
  "write-capable main/core command runtime",
  "atomic source patch application",
  "write IPC with explicit authorization",
  "dirty-state persistence policy",
  "source freshness and conflict detector",
  "refresh executor after successful writes",
  "durable transaction records",
  "undo/redo execution policy"
] as const;
