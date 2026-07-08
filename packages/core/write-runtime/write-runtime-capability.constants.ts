export const WRITE_RUNTIME_UNAVAILABLE_STATUS = "unavailable";
export const WRITE_RUNTIME_BLOCKED_STATUS = "blocked";
export const WRITE_RUNTIME_UNSUPPORTED_STATUS = "unsupported";

export const WRITE_RUNTIME_CAPABILITY_SAFETY_NOTE =
  "Write runtime capability previews describe missing services only; they cannot write files, apply patches, expose write IPC, persist transactions, or execute undo/redo.";

export const WRITE_RUNTIME_MISSING_MAIN_WRITE_SERVICE = "main-write-service";
export const WRITE_RUNTIME_MISSING_PATCH_APPLY_SERVICE = "patch-apply-service";
export const WRITE_RUNTIME_MISSING_WRITE_IPC = "write-ipc";
export const WRITE_RUNTIME_MISSING_DURABLE_TRANSACTION_STORE = "durable-transaction-store";
export const WRITE_RUNTIME_MISSING_DIRTY_STATE_STORE = "dirty-state-store";
export const WRITE_RUNTIME_MISSING_CONFLICT_DETECTOR = "conflict-detector";
export const WRITE_RUNTIME_MISSING_REFRESH_EXECUTOR = "refresh-executor";

export const WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES = [
  WRITE_RUNTIME_MISSING_MAIN_WRITE_SERVICE,
  WRITE_RUNTIME_MISSING_PATCH_APPLY_SERVICE,
  WRITE_RUNTIME_MISSING_WRITE_IPC,
  WRITE_RUNTIME_MISSING_DURABLE_TRANSACTION_STORE,
  WRITE_RUNTIME_MISSING_DIRTY_STATE_STORE,
  WRITE_RUNTIME_MISSING_CONFLICT_DETECTOR,
  WRITE_RUNTIME_MISSING_REFRESH_EXECUTOR
] as const;
