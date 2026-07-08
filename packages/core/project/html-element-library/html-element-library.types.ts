export type HtmlElementLibraryCategory =
  | "structure"
  | "text"
  | "media"
  | "forms"
  | "lists-and-tables"
  | "interaction"
  | "semantic-accessibility"
  | "presets";

export type HtmlElementLibraryItemKind = "element" | "preset" | "accessibility-helper";
export type HtmlElementInsertionMode = "before" | "after" | "inside";

export interface HtmlElementLibraryItem {
  readonly id: string;
  readonly label: string;
  readonly category: HtmlElementLibraryCategory;
  readonly description: string;
  readonly tagName?: string;
  readonly kind: HtmlElementLibraryItemKind;
  readonly allowedInsertionModes: readonly HtmlElementInsertionMode[];
  readonly requiredAttributes?: readonly string[];
  readonly recommendedAttributes?: readonly string[];
  readonly allowedChildrenHint?: string;
  readonly accessibilityNotes?: string;
  readonly isImplemented: false;
}

export interface HtmlElementLibraryCategoryDefinition {
  readonly id: HtmlElementLibraryCategory;
  readonly label: string;
  readonly description: string;
}

export interface HtmlElementLibraryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}
