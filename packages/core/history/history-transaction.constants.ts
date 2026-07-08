export const HISTORY_TRANSACTION_PREVIEW_ONLY_STATUS = "preview-only" as const;
export const HISTORY_TRANSACTION_BLOCKED_STATUS = "blocked" as const;
export const HISTORY_TRANSACTION_UNSUPPORTED_STATUS = "unsupported" as const;

export const HISTORY_TRANSACTION_REVERSE_PATCH_UNDO_STRATEGY = "reverse-patch" as const;
export const HISTORY_TRANSACTION_RESTORE_SNAPSHOT_UNDO_STRATEGY = "restore-snapshot" as const;
export const HISTORY_TRANSACTION_UNSUPPORTED_UNDO_STRATEGY = "unsupported" as const;
export const HISTORY_TRANSACTION_UNAVAILABLE_UNDO_STRATEGY = "unavailable" as const;

export const HISTORY_TRANSACTION_REPLAY_COMMAND_REDO_STRATEGY = "replay-command" as const;
export const HISTORY_TRANSACTION_REPLAY_PATCH_REDO_STRATEGY = "replay-patch" as const;
export const HISTORY_TRANSACTION_UNSUPPORTED_REDO_STRATEGY = "unsupported" as const;
export const HISTORY_TRANSACTION_UNAVAILABLE_REDO_STRATEGY = "unavailable" as const;

export const HISTORY_TRANSACTION_UNSPECIFIED_CREATED_AT = "preview-created-at-unspecified" as const;

export const HISTORY_TRANSACTION_PREVIEW_SAFETY_NOTE =
  "History transaction previews are planning descriptors only; they cannot execute undo, redo, patches, or persistence.";
