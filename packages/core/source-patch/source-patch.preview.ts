import {
  SOURCE_PATCH_MAX_CONTEXT_CHARS,
  SOURCE_PATCH_MAX_INSERTED_CHARS,
  SOURCE_PATCH_OPERATION_INSERT_TEXT,
  SOURCE_PATCH_READY_STATUS
} from "./source-patch.constants";
import type { InsertTextSourcePatchPreviewInput, SourcePatchPreview } from "./source-patch.types";
import { validateSourcePatchPreview } from "./source-patch.validators";

export function createInsertTextSourcePatchPreview(input: InsertTextSourcePatchPreviewInput): SourcePatchPreview {
  const insertedTextPreview = limitText(input.insertedText, SOURCE_PATCH_MAX_INSERTED_CHARS);
  const sourceText = input.sourceText ?? "";
  const safeOffset = Math.max(0, Math.min(input.startOffset, sourceText.length || input.startOffset));
  const beforeTextPreview = sourceText ? limitText(sourceText.slice(Math.max(0, safeOffset - SOURCE_PATCH_MAX_CONTEXT_CHARS), safeOffset), SOURCE_PATCH_MAX_CONTEXT_CHARS) : "";
  const afterTextPreview = sourceText ? limitText(sourceText.slice(safeOffset, safeOffset + SOURCE_PATCH_MAX_CONTEXT_CHARS), SOURCE_PATCH_MAX_CONTEXT_CHARS) : "";

  const preview: SourcePatchPreview = {
    patchId: input.patchId.trim(),
    targetFilePath: input.targetFilePath.trim(),
    operationKind: SOURCE_PATCH_OPERATION_INSERT_TEXT,
    status: SOURCE_PATCH_READY_STATUS,
    range: {
      startOffset: input.startOffset,
      endOffset: input.startOffset,
      startLine: input.startLine,
      startColumn: input.startColumn,
      endLine: input.startLine,
      endColumn: input.startColumn
    },
    beforeTextPreview,
    insertedTextPreview,
    afterTextPreview,
    humanSummary: input.humanSummary.trim(),
    reversible: true,
    warnings: input.warnings ?? [],
    errors: []
  };

  const validation = validateSourcePatchPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function limitText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`;
}
