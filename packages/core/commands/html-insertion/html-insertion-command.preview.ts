import { createInsertTextSourcePatchPreview } from "../../source-patch";
import type { HtmlElementLibraryItem } from "../../project/html-element-library";
import { HTML_ELEMENT_VOID_TAG_NAMES } from "../../project/html-element-library";
import type { AddHtmlElementCommand } from "./html-insertion-command.types";

export function createHtmlElementInsertTextPreview(item: HtmlElementLibraryItem): string | null {
  if (item.kind !== "element" || !item.tagName) return null;
  const tagName = item.tagName.toLowerCase();
  return HTML_ELEMENT_VOID_TAG_NAMES.has(tagName) ? `<${tagName}>` : `<${tagName}></${tagName}>`;
}

export function createAddHtmlElementSourcePatchPreview(command: AddHtmlElementCommand, item: HtmlElementLibraryItem, targetTagName: string, offset: number, line?: number, column?: number) {
  const insertedText = createHtmlElementInsertTextPreview(item);
  if (!insertedText) return null;

  return createInsertTextSourcePatchPreview({
    patchId: `${command.commandId}:source-patch-preview`,
    targetFilePath: command.targetFilePath,
    startOffset: offset,
    startLine: line,
    startColumn: column,
    insertedText,
    humanSummary: `insert <${item.tagName?.toLowerCase()}> ${command.insertionMode} <${targetTagName}>`,
    warnings: item.requiredAttributes?.length ? [`Required attributes not included in Phase 6B preview: ${item.requiredAttributes.join(", ")}.`] : []
  });
}
