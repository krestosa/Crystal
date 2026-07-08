export type SourcePatchOperationKind = "insert-text" | "replace-text" | "remove-text";
export type SourcePatchPreviewStatus = "ready" | "blocked" | "invalid" | "unsupported";

export interface SourcePatchRange {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface SourcePatchPreview {
  readonly patchId: string;
  readonly targetFilePath: string;
  readonly operationKind: SourcePatchOperationKind;
  readonly status: SourcePatchPreviewStatus;
  readonly range: SourcePatchRange;
  readonly beforeTextPreview: string;
  readonly insertedTextPreview: string;
  readonly afterTextPreview: string;
  readonly humanSummary: string;
  readonly reversible: boolean;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

export interface SourcePatchValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: SourcePatchPreview;
}

export interface InsertTextSourcePatchPreviewInput {
  readonly patchId: string;
  readonly targetFilePath: string;
  readonly startOffset: number;
  readonly insertedText: string;
  readonly sourceText?: string;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly humanSummary: string;
  readonly warnings?: readonly string[];
}
