import type { WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES } from "./write-runtime-capability.constants";

export type WriteRuntimeCapabilityPreviewStatus = "unavailable" | "blocked" | "unsupported";
export type WriteRuntimeMissingCapability = (typeof WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES)[number];

export interface WriteRuntimeCapabilityPreview {
  readonly capabilityId: string;
  readonly status: WriteRuntimeCapabilityPreviewStatus;
  readonly canWriteFiles: false;
  readonly canApplyPatches: false;
  readonly hasWriteIpc: false;
  readonly canPersistTransactions: false;
  readonly canExecuteUndoRedo: false;
  readonly blockedReason: string;
  readonly missingCapabilities: readonly WriteRuntimeMissingCapability[];
  readonly safetyNotes: readonly string[];
}

export interface WriteRuntimeCapabilityPreviewInput {
  readonly capabilityId: string;
  readonly status?: WriteRuntimeCapabilityPreviewStatus;
  readonly blockedReason?: string;
  readonly missingCapabilities?: readonly WriteRuntimeMissingCapability[];
  readonly safetyNotes?: readonly string[];
}

export interface WriteRuntimeCapabilityValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: WriteRuntimeCapabilityPreview;
}
