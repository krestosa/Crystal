import type { HtmlElementInsertionMode } from "../../project/html-element-library";
import type { ADD_HTML_ELEMENT_COMMAND_KIND, HTML_ELEMENT_LIBRARY_COMMAND_SOURCE } from "./html-insertion-command.constants";

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
