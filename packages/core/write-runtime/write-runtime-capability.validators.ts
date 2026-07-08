import { WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES } from "./write-runtime-capability.constants";
import type { WriteRuntimeCapabilityPreview, WriteRuntimeCapabilityValidationResult, WriteRuntimeMissingCapability } from "./write-runtime-capability.types";

const requiredCapabilitySet = new Set<string>(WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES);

export function validateWriteRuntimeCapabilityPreview(preview: WriteRuntimeCapabilityPreview): WriteRuntimeCapabilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingCapabilities = normalizeMissingCapabilities(preview.missingCapabilities, errors);

  if (!preview.capabilityId.trim()) errors.push("WriteRuntimeCapabilityPreview requires a capabilityId.");
  if (preview.canWriteFiles !== false) errors.push("WriteRuntimeCapabilityPreview.canWriteFiles must remain false in Phase 6D.");
  if (preview.canApplyPatches !== false) errors.push("WriteRuntimeCapabilityPreview.canApplyPatches must remain false in Phase 6D.");
  if (preview.hasWriteIpc !== false) errors.push("WriteRuntimeCapabilityPreview.hasWriteIpc must remain false in Phase 6D.");
  if (preview.canPersistTransactions !== false) errors.push("WriteRuntimeCapabilityPreview.canPersistTransactions must remain false in Phase 6D.");
  if (preview.canExecuteUndoRedo !== false) errors.push("WriteRuntimeCapabilityPreview.canExecuteUndoRedo must remain false in Phase 6D.");
  if (!preview.blockedReason.trim()) errors.push("WriteRuntimeCapabilityPreview requires a blockedReason.");

  for (const capability of WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES) {
    if (!missingCapabilities.includes(capability)) warnings.push(`Missing capability list should include ${capability}.`);
  }

  const normalizedPreview: WriteRuntimeCapabilityPreview = {
    ...preview,
    capabilityId: preview.capabilityId.trim(),
    canWriteFiles: false,
    canApplyPatches: false,
    hasWriteIpc: false,
    canPersistTransactions: false,
    canExecuteUndoRedo: false,
    blockedReason: preview.blockedReason.trim(),
    missingCapabilities,
    safetyNotes: normalizeStringList(preview.safetyNotes, "safetyNotes", errors)
  };

  return { valid: errors.length === 0, errors, warnings, normalizedPreview };
}

export function normalizeMissingCapabilities(values: readonly WriteRuntimeMissingCapability[] | undefined, errors: string[] = []): readonly WriteRuntimeMissingCapability[] {
  const normalized = new Set<WriteRuntimeMissingCapability>();
  for (const value of values ?? WRITE_RUNTIME_REQUIRED_MISSING_CAPABILITIES) {
    if (!requiredCapabilitySet.has(value)) {
      errors.push(`Unknown write runtime capability: ${value}`);
      continue;
    }
    normalized.add(value);
  }
  return [...normalized].sort();
}

function normalizeStringList(values: readonly string[], label: string, errors: string[]): readonly string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const text = value.trim();
    if (!text) {
      errors.push(`${label} cannot contain empty values.`);
      continue;
    }
    normalized.add(text);
  }
  return [...normalized].sort();
}
