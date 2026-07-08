export const INSPECTOR_EDITING_READONLY_FIELD_STATUS = "readonly";
export const INSPECTOR_EDITING_DRAFTABLE_FIELD_STATUS = "draftable";
export const INSPECTOR_EDITING_BLOCKED_FIELD_STATUS = "blocked";
export const INSPECTOR_EDITING_UNSUPPORTED_FIELD_STATUS = "unsupported";

export const INSPECTOR_EDITING_EMPTY_DRAFT_STATUS = "empty";
export const INSPECTOR_EDITING_DRAFT_PREVIEW_STATUS = "draft-preview";
export const INSPECTOR_EDITING_BLOCKED_DRAFT_STATUS = "blocked";
export const INSPECTOR_EDITING_UNSUPPORTED_DRAFT_STATUS = "unsupported";

export const INSPECTOR_EDITING_PREVIEW_ONLY_INTENT_STATUS = "preview-only";
export const INSPECTOR_EDITING_BLOCKED_INTENT_STATUS = "blocked";
export const INSPECTOR_EDITING_UNSUPPORTED_INTENT_STATUS = "unsupported";

export const INSPECTOR_EDITING_READINESS_BLOCKED_STATUS = "blocked";
export const INSPECTOR_EDITING_READINESS_PREVIEW_ONLY_STATUS = "preview-only";
export const INSPECTOR_EDITING_READINESS_UNSUPPORTED_STATUS = "unsupported";

export const INSPECTOR_EDITING_APPLY_BLOCKED_REASON =
  "Inspector editing is draft/intent preview only until write runtime, source patch persistence, write IPC, refresh execution, dirty-state persistence, and real undo/redo are implemented.";

export const INSPECTOR_EDITING_PREVIEW_SAFETY_NOTE =
  "Inspector editing previews describe draft intent only; they cannot write files, persist dirty state, enable Apply, mutate Preview DOM, execute refresh, or execute undo/redo.";

export const INSPECTOR_EDITING_UNSUPPORTED_FIELD_KINDS = ["tag-name", "class-list", "inline-style"] as const;

export const INSPECTOR_EDITING_MISSING_REQUIREMENTS = [
  "trusted Preview Inspector selection",
  "DOM Snapshot node path",
  "sourceLocation mapping",
  "CommandTransactionPlanPreview for future writes",
  "DesignEditingReadinessPreview that remains Apply-blocked"
] as const;
