import { findHtmlElementLibraryItem, type HtmlElementInsertionMode } from "../../project/html-element-library";

export const ADD_HTML_ELEMENT_COMMAND_KIND = "add-html-element" as const;
export const HTML_ELEMENT_LIBRARY_COMMAND_SOURCE = "element-library" as const;
export const HTML_INSERTION_NOT_IMPLEMENTED_REASON = "HTML insertion command execution is not implemented in Phase 6A.";

export interface AddHtmlElementCommand {
  readonly commandId: string;
  readonly kind: typeof ADD_HTML_ELEMENT_COMMAND_KIND;
  readonly elementId: string;
  readonly targetFilePath: string;
  readonly targetSnapshotPath: string;
  readonly insertionMode: HtmlElementInsertionMode;
  readonly requestedAt: number;
  readonly source: typeof HTML_ELEMENT_LIBRARY_COMMAND_SOURCE;
}

export interface HtmlInsertionCommandValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedCommand?: AddHtmlElementCommand;
}

export interface HtmlInsertionCommandExecutionBlocker {
  readonly ok: false;
  readonly reason: string;
  readonly commandKind: typeof ADD_HTML_ELEMENT_COMMAND_KIND;
}

const HTML_INSERTION_MODES = new Set<HtmlElementInsertionMode>(["before", "after", "inside"]);

export function validateAddHtmlElementCommand(command: AddHtmlElementCommand): HtmlInsertionCommandValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [HTML_INSERTION_NOT_IMPLEMENTED_REASON];
  const element = findHtmlElementLibraryItem(command.elementId);

  if (!command.commandId.trim()) errors.push("commandId is required.");
  if (command.kind !== ADD_HTML_ELEMENT_COMMAND_KIND) errors.push("Unsupported command kind.");
  if (!element) errors.push(`Unknown elementId: ${command.elementId}`);
  if (!command.targetFilePath.trim()) errors.push("targetFilePath is required.");
  if (!command.targetSnapshotPath.trim()) errors.push("targetSnapshotPath is required.");
  if (!HTML_INSERTION_MODES.has(command.insertionMode)) errors.push(`Unsupported insertionMode: ${command.insertionMode}`);
  if (!Number.isFinite(command.requestedAt) || command.requestedAt <= 0) errors.push("requestedAt must be a positive timestamp.");
  if (command.source !== HTML_ELEMENT_LIBRARY_COMMAND_SOURCE) errors.push("HTML insertion commands must originate from the Element Library foundation.");
  if (element?.isImplemented !== false) errors.push("Catalog items must remain non-executable in Phase 6A.");

  if (element && !element.allowedInsertionModes.includes(command.insertionMode)) {
    errors.push(`Insertion mode ${command.insertionMode} is not allowed for ${element.id}.`);
  }

  errors.push(HTML_INSERTION_NOT_IMPLEMENTED_REASON);

  return {
    valid: false,
    errors,
    warnings,
    normalizedCommand: errors.length === 1 && errors[0] === HTML_INSERTION_NOT_IMPLEMENTED_REASON ? normalizeAddHtmlElementCommand(command) : undefined
  };
}

export function createHtmlInsertionExecutionBlocker(): HtmlInsertionCommandExecutionBlocker {
  return {
    ok: false,
    reason: HTML_INSERTION_NOT_IMPLEMENTED_REASON,
    commandKind: ADD_HTML_ELEMENT_COMMAND_KIND
  };
}

export function assertHtmlInsertionExecutionBlocked(): HtmlInsertionCommandExecutionBlocker {
  return createHtmlInsertionExecutionBlocker();
}

function normalizeAddHtmlElementCommand(command: AddHtmlElementCommand): AddHtmlElementCommand {
  return {
    commandId: command.commandId.trim(),
    kind: ADD_HTML_ELEMENT_COMMAND_KIND,
    elementId: command.elementId.trim(),
    targetFilePath: command.targetFilePath.trim(),
    targetSnapshotPath: command.targetSnapshotPath.trim(),
    insertionMode: command.insertionMode,
    requestedAt: command.requestedAt,
    source: HTML_ELEMENT_LIBRARY_COMMAND_SOURCE
  };
}
