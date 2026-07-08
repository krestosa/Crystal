import type { HtmlElementInsertionMode, HtmlElementLibraryCategoryDefinition } from "./html-element-library.types";

export const HTML_ELEMENT_INSERTION_MODES: readonly HtmlElementInsertionMode[] = ["before", "after", "inside"];
export const HTML_ELEMENT_SIBLING_INSERTION_MODES: readonly HtmlElementInsertionMode[] = ["before", "after"];
export const HTML_ELEMENT_INSIDE_INSERTION_MODE: readonly HtmlElementInsertionMode[] = ["inside"];

export const HTML_ELEMENT_VOID_TAG_NAMES = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

export const HTML_ELEMENT_LIBRARY_CATEGORIES: readonly HtmlElementLibraryCategoryDefinition[] = [
  { id: "structure", label: "Structure", description: "Document and layout landmarks." },
  { id: "text", label: "Text", description: "Headings, paragraphs, and inline semantics." },
  { id: "media", label: "Media", description: "Images, embedded media, and drawing surfaces." },
  { id: "forms", label: "Forms", description: "Form fields and related grouping controls." },
  { id: "lists-and-tables", label: "Lists & Tables", description: "Ordered data and tabular structure." },
  { id: "interaction", label: "Interaction", description: "Native disclosure and modal primitives." },
  { id: "semantic-accessibility", label: "Semantic / Accessibility", description: "Landmarks and accessible helper patterns." },
  { id: "presets", label: "Presets", description: "Reusable clean HTML composition targets." }
];
