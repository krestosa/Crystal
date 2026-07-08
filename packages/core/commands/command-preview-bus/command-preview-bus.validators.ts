import type { CommandBusValidationResult, CommandEnvelope } from "./command-preview-bus.types";

export function validateCommandEnvelope(envelope: CommandEnvelope): CommandBusValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!envelope.commandId.trim()) errors.push("commandId is required.");
  if (!envelope.commandKind.trim()) errors.push("commandKind is required.");
  if (!envelope.source.trim()) errors.push("source is required.");
  if (!Number.isFinite(envelope.createdAt) || envelope.createdAt <= 0) errors.push("createdAt must be a positive timestamp.");
  if (envelope.dryRun !== true) errors.push("Command Preview Bus foundation accepts dryRun=true envelopes only.");
  if (envelope.payload === null || envelope.payload === undefined) warnings.push("payload is empty.");

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
