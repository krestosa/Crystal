import {
  WRITE_RUNTIME_CAPABILITY_SAFETY_NOTE,
  WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES,
  WRITE_RUNTIME_UNAVAILABLE_STATUS
} from "./write-runtime-capability.constants";
import type { WriteRuntimeCapabilityPreview, WriteRuntimeCapabilityPreviewInput } from "./write-runtime-capability.types";
import { normalizeMissingCapabilities, validateWriteRuntimeCapabilityPreview } from "./write-runtime-capability.validators";

export function createWriteRuntimeCapabilityPreview(input: WriteRuntimeCapabilityPreviewInput): WriteRuntimeCapabilityPreview {
  const errors: string[] = [];
  const missingCapabilities = normalizeMissingCapabilities(input.missingCapabilities ?? WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES, errors);
  const blockedReason = input.blockedReason ?? `Write runtime is unavailable; missing ${missingCapabilities.join(", ")}.`;

  const preview: WriteRuntimeCapabilityPreview = {
    capabilityId: input.capabilityId.trim(),
    status: input.status ?? WRITE_RUNTIME_UNAVAILABLE_STATUS,
    canWriteFiles: false,
    canApplyPatches: false,
    hasWriteIpc: false,
    canPersistTransactions: false,
    canExecuteUndoRedo: false,
    blockedReason,
    missingCapabilities,
    safetyNotes: [WRITE_RUNTIME_CAPABILITY_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateWriteRuntimeCapabilityPreview(preview);
  return validation.normalizedPreview ?? preview;
}
