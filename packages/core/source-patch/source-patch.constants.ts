export const SOURCE_PATCH_MAX_PREVIEW_CHARS = 240;
export const SOURCE_PATCH_MAX_INSERTED_CHARS = 500;
export const SOURCE_PATCH_MAX_CONTEXT_CHARS = 96;

export const SOURCE_PATCH_READY_STATUS = "ready" as const;
export const SOURCE_PATCH_BLOCKED_STATUS = "blocked" as const;
export const SOURCE_PATCH_INVALID_STATUS = "invalid" as const;
export const SOURCE_PATCH_UNSUPPORTED_STATUS = "unsupported" as const;

export const SOURCE_PATCH_OPERATION_INSERT_TEXT = "insert-text" as const;
export const SOURCE_PATCH_OPERATION_REPLACE_TEXT = "replace-text" as const;
export const SOURCE_PATCH_OPERATION_REMOVE_TEXT = "remove-text" as const;
