import {
  COMMAND_BUS_EXECUTION_BLOCKED_REASON,
  COMMAND_PREVIEW_BLOCKED_STATUS,
  COMMAND_PREVIEW_READY_STATUS,
  COMMAND_PREVIEW_UNSUPPORTED_STATUS,
  type CommandPreviewResult
} from "../command-bus";
import type { ProjectDomSnapshotState } from "../../project/dom/project-dom-snapshot.types";
import type { ProjectGraph } from "../../project/graph/project-graph.types";
import type { ProjectPreviewState } from "../../project/preview/project-preview.types";
import type { ProjectPreviewSelectionState } from "../../project/preview-selection/project-preview-selection.types";
import {
  findHtmlElementLibraryItem,
  selectHtmlInsertionTargetEligibility,
  type HtmlElementLibraryItem,
  type HtmlInsertionTargetEligibility
} from "../../project/html-element-library";
import { createHtmlSourceInsertionAnchor } from "../../source-patch";
import { HTML_INSERTION_NOT_IMPLEMENTED_REASON } from "./html-insertion-command.constants";
import type { AddHtmlElementCommand } from "./html-insertion-command.types";
import { validateAddHtmlElementCommand } from "./html-insertion-command.validators";
import { createAddHtmlElementSourcePatchPreview } from "./html-insertion-command.preview";

export interface AddHtmlElementCommandPreviewContext {
  readonly domSnapshotState: ProjectDomSnapshotState | null;
  readonly previewState: ProjectPreviewState | null;
  readonly previewSelectionState: ProjectPreviewSelectionState | null;
  readonly projectGraph: ProjectGraph | null;
  readonly selectedElementLibraryItem?: HtmlElementLibraryItem | null;
  readonly targetEligibility?: HtmlInsertionTargetEligibility | null;
}

export function previewAddHtmlElementCommand(command: AddHtmlElementCommand, context: AddHtmlElementCommandPreviewContext): CommandPreviewResult {
  const validation = validateAddHtmlElementCommand(command);
  const fatalValidationErrors = validation.errors.filter((error) => error !== HTML_INSERTION_NOT_IMPLEMENTED_REASON);
  const normalizedCommand = validation.normalizedCommand ?? command;
  const warnings = [...validation.warnings, COMMAND_BUS_EXECUTION_BLOCKED_REASON];

  if (fatalValidationErrors.length > 0) {
    return {
      commandId: command.commandId,
      commandKind: command.kind,
      status: COMMAND_PREVIEW_BLOCKED_STATUS,
      errors: fatalValidationErrors,
      warnings,
      humanSummary: "HTML insertion preview is blocked by command validation."
    };
  }

  const item = context.selectedElementLibraryItem ?? findHtmlElementLibraryItem(normalizedCommand.elementId);
  if (!item) return blocked(normalizedCommand, "Element Library item was not found.", warnings);
  if (item.kind !== "element" || !item.tagName) {
    return unsupported(normalizedCommand, "Only simple HTML element previews are supported in Phase 6B.", warnings);
  }

  const targetEligibility = context.targetEligibility ?? selectHtmlInsertionTargetEligibility({
    projectGraph: context.projectGraph,
    preview: context.previewState,
    domSnapshot: context.domSnapshotState,
    previewSelection: context.previewSelectionState
  });

  const anchor = createHtmlSourceInsertionAnchor({
    targetEligibility,
    domSnapshotState: context.domSnapshotState,
    insertionMode: normalizedCommand.insertionMode,
    selectedItem: item
  });

  if (anchor.status !== "ready" || !anchor.sourceLocation) {
    const status = anchor.status === "unsupported-mode" || anchor.status === "unsupported-target" ? COMMAND_PREVIEW_UNSUPPORTED_STATUS : COMMAND_PREVIEW_BLOCKED_STATUS;
    return {
      commandId: normalizedCommand.commandId,
      commandKind: normalizedCommand.kind,
      status,
      errors: [anchor.reason],
      warnings,
      humanSummary: anchor.reason
    };
  }

  const patchPreview = createAddHtmlElementSourcePatchPreview(
    normalizedCommand,
    item,
    anchor.targetTagName,
    anchor.sourceLocation.offset,
    anchor.sourceLocation.line,
    anchor.sourceLocation.column
  );

  if (!patchPreview) return unsupported(normalizedCommand, "No safe HTML template is available for this Element Library item.", warnings);

  return {
    commandId: normalizedCommand.commandId,
    commandKind: normalizedCommand.kind,
    status: COMMAND_PREVIEW_READY_STATUS,
    sourcePatchPreview: patchPreview,
    errors: [],
    warnings: [...warnings, ...patchPreview.warnings],
    humanSummary: patchPreview.humanSummary
  };
}

function blocked(command: AddHtmlElementCommand, reason: string, warnings: readonly string[]): CommandPreviewResult {
  return {
    commandId: command.commandId,
    commandKind: command.kind,
    status: COMMAND_PREVIEW_BLOCKED_STATUS,
    errors: [reason],
    warnings,
    humanSummary: reason
  };
}

function unsupported(command: AddHtmlElementCommand, reason: string, warnings: readonly string[]): CommandPreviewResult {
  return {
    commandId: command.commandId,
    commandKind: command.kind,
    status: COMMAND_PREVIEW_UNSUPPORTED_STATUS,
    errors: [reason],
    warnings,
    humanSummary: reason
  };
}
