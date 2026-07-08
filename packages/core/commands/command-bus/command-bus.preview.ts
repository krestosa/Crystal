import {
  COMMAND_BUS_EXECUTION_BLOCKED_REASON,
  COMMAND_PREVIEW_BLOCKED_STATUS,
  COMMAND_PREVIEW_INVALID_STATUS,
  COMMAND_PREVIEW_UNSUPPORTED_STATUS
} from "./command-bus.constants";
import type { CommandEnvelope, CommandExecutionBlocker, CommandPreviewPlanner, CommandPreviewResult } from "./command-bus.types";
import { validateCommandEnvelope } from "./command-bus.validators";

export function previewCommandEnvelope<TPayload, TContext>(
  envelope: CommandEnvelope<TPayload>,
  context: TContext,
  planner: CommandPreviewPlanner<TPayload, TContext>
): CommandPreviewResult {
  const validation = validateCommandEnvelope(envelope);
  if (!validation.valid) {
    return {
      commandId: envelope.commandId,
      commandKind: envelope.commandKind,
      status: COMMAND_PREVIEW_INVALID_STATUS,
      errors: validation.errors,
      warnings: validation.warnings,
      humanSummary: "Command preview is invalid."
    };
  }

  return planner(envelope, context);
}

export function createCommandExecutionBlocker(commandKind: string, reason = COMMAND_BUS_EXECUTION_BLOCKED_REASON): CommandExecutionBlocker {
  return {
    ok: false,
    reason,
    commandKind
  };
}

export function executeCommandEnvelope(envelope: CommandEnvelope): CommandExecutionBlocker {
  return createCommandExecutionBlocker(envelope.commandKind);
}

export function createBlockedCommandPreview(envelope: Pick<CommandEnvelope, "commandId" | "commandKind">, reason: string): CommandPreviewResult {
  return {
    commandId: envelope.commandId,
    commandKind: envelope.commandKind,
    status: COMMAND_PREVIEW_BLOCKED_STATUS,
    errors: [reason],
    warnings: [COMMAND_BUS_EXECUTION_BLOCKED_REASON],
    humanSummary: reason
  };
}

export function createUnsupportedCommandPreview(envelope: Pick<CommandEnvelope, "commandId" | "commandKind">, reason: string): CommandPreviewResult {
  return {
    commandId: envelope.commandId,
    commandKind: envelope.commandKind,
    status: COMMAND_PREVIEW_UNSUPPORTED_STATUS,
    errors: [reason],
    warnings: [COMMAND_BUS_EXECUTION_BLOCKED_REASON],
    humanSummary: reason
  };
}
