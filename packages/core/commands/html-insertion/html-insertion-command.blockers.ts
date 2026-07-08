import { ADD_HTML_ELEMENT_COMMAND_KIND, HTML_INSERTION_NOT_IMPLEMENTED_REASON } from "./html-insertion-command.constants";
import type { HtmlInsertionCommandExecutionBlocker } from "./html-insertion-command.types";

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
