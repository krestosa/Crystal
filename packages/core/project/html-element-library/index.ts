import type { ProjectDomNode, ProjectDomSnapshotState } from "../dom/project-dom-snapshot.types";
import type { ProjectGraph } from "../graph/project-graph.types";
import type { ProjectPreviewState } from "../preview/project-preview.types";
import type { ProjectPreviewSelectionState } from "../preview-selection/project-preview-selection.types";

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

export type HtmlInsertionTargetStateCode =
  | "none"
  | "no-project"
  | "no-preview-target"
  | "no-selection"
  | "missing-snapshot"
  | "stale-snapshot"
  | "mismatched-selection"
  | "ambiguous-selection"
  | "matched-target"
  | "unsupported-target";

export interface HtmlInsertionTargetEligibilityInput {
  readonly projectGraph: ProjectGraph | null;
  readonly preview: ProjectPreviewState | null;
  readonly domSnapshot: ProjectDomSnapshotState | null;
  readonly previewSelection: ProjectPreviewSelectionState | null;
}

export interface HtmlInsertionTargetEligibility {
  readonly state: HtmlInsertionTargetStateCode;
  readonly label: string;
  readonly reason: string;
  readonly targetTagName?: string;
  readonly targetSnapshotPath?: string;
  readonly targetFilePath?: string;
  readonly canInsertBefore: boolean;
  readonly canInsertAfter: boolean;
  readonly canInsertInside: boolean;
}

const ALL_INSERTION_MODES: readonly HtmlElementInsertionMode[] = ["before", "after", "inside"];
const SIBLING_INSERTION_MODES: readonly HtmlElementInsertionMode[] = ["before", "after"];
const INSIDE_INSERTION_MODE: readonly HtmlElementInsertionMode[] = ["inside"];
const VOID_TAG_NAMES = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

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

export const HTML_ELEMENT_LIBRARY_CATALOG: readonly HtmlElementLibraryItem[] = [
  item("div", "Div", "structure", "Generic block container.", "element", "div"),
  item("section", "Section", "structure", "Thematic document section.", "element", "section", { accessibilityNotes: "Prefer a heading when the section has semantic meaning." }),
  item("article", "Article", "structure", "Self-contained composition.", "element", "article"),
  item("main", "Main", "structure", "Primary page content landmark.", "element", "main", { accessibilityNotes: "Use only once per page." }),
  item("header", "Header", "structure", "Introductory content or section header.", "element", "header"),
  item("footer", "Footer", "structure", "Footer content for a page or section.", "element", "footer"),
  item("aside", "Aside", "structure", "Tangential or complementary content.", "element", "aside"),
  item("nav", "Nav", "structure", "Navigation landmark.", "element", "nav", { accessibilityNotes: "Add an aria-label when multiple nav landmarks exist." }),

  item("h1", "Heading 1", "text", "Top-level heading.", "element", "h1", { allowedChildrenHint: "Phrasing content." }),
  item("h2", "Heading 2", "text", "Second-level heading.", "element", "h2", { allowedChildrenHint: "Phrasing content." }),
  item("h3", "Heading 3", "text", "Third-level heading.", "element", "h3", { allowedChildrenHint: "Phrasing content." }),
  item("h4", "Heading 4", "text", "Fourth-level heading.", "element", "h4", { allowedChildrenHint: "Phrasing content." }),
  item("h5", "Heading 5", "text", "Fifth-level heading.", "element", "h5", { allowedChildrenHint: "Phrasing content." }),
  item("h6", "Heading 6", "text", "Sixth-level heading.", "element", "h6", { allowedChildrenHint: "Phrasing content." }),
  item("p", "Paragraph", "text", "Paragraph text block.", "element", "p", { allowedChildrenHint: "Phrasing content." }),
  item("span", "Span", "text", "Generic inline text wrapper.", "element", "span", { allowedInsertionModes: SIBLING_INSERTION_MODES }),
  item("blockquote", "Blockquote", "text", "Quoted block-level content.", "element", "blockquote", { recommendedAttributes: ["cite"] }),
  item("code", "Code", "text", "Inline code fragment.", "element", "code", { allowedInsertionModes: SIBLING_INSERTION_MODES }),
  item("pre", "Preformatted", "text", "Preformatted text block.", "element", "pre"),
  item("strong", "Strong", "text", "Strong importance inline text.", "element", "strong", { allowedInsertionModes: SIBLING_INSERTION_MODES }),
  item("em", "Emphasis", "text", "Emphasized inline text.", "element", "em", { allowedInsertionModes: SIBLING_INSERTION_MODES }),
  item("small", "Small", "text", "Side comments or fine print.", "element", "small", { allowedInsertionModes: SIBLING_INSERTION_MODES }),

  item("img", "Image", "media", "Image resource.", "element", "img", { requiredAttributes: ["src", "alt"], allowedChildrenHint: "Void element." }),
  item("picture", "Picture", "media", "Responsive image wrapper.", "element", "picture", { allowedChildrenHint: "source elements followed by img." }),
  item("source", "Source", "media", "Media source candidate.", "element", "source", { requiredAttributes: ["srcset"], allowedInsertionModes: SIBLING_INSERTION_MODES, allowedChildrenHint: "Void element." }),
  item("video", "Video", "media", "Video player element.", "element", "video", { recommendedAttributes: ["controls"] }),
  item("audio", "Audio", "media", "Audio player element.", "element", "audio", { recommendedAttributes: ["controls"] }),
  item("svg", "SVG", "media", "Inline vector graphics root.", "element", "svg", { recommendedAttributes: ["viewBox"], accessibilityNotes: "Name meaningful graphics or hide decorative ones." }),
  item("canvas", "Canvas", "media", "Scriptable drawing surface.", "element", "canvas", { accessibilityNotes: "Provide fallback text or an accessible alternative." }),

  item("form", "Form", "forms", "Form submission container.", "element", "form"),
  item("label", "Label", "forms", "Form field label.", "element", "label", { recommendedAttributes: ["for"] }),
  item("input", "Input", "forms", "Single-line form control.", "element", "input", { recommendedAttributes: ["type", "name"], allowedChildrenHint: "Void element." }),
  item("textarea", "Textarea", "forms", "Multi-line text input.", "element", "textarea", { recommendedAttributes: ["name"] }),
  item("select", "Select", "forms", "Option picker control.", "element", "select", { allowedChildrenHint: "option or optgroup elements." }),
  item("option", "Option", "forms", "Selectable option.", "element", "option", { allowedInsertionModes: SIBLING_INSERTION_MODES }),
  item("button", "Button", "forms", "Clickable form or UI button.", "element", "button", { recommendedAttributes: ["type"], accessibilityNotes: "Buttons need an accessible name." }),
  item("fieldset", "Fieldset", "forms", "Group related form controls.", "element", "fieldset"),
  item("legend", "Legend", "forms", "Caption for a fieldset.", "element", "legend", { allowedInsertionModes: SIBLING_INSERTION_MODES }),

  item("ul", "Unordered list", "lists-and-tables", "Bulleted list.", "element", "ul", { allowedChildrenHint: "li elements." }),
  item("ol", "Ordered list", "lists-and-tables", "Numbered list.", "element", "ol", { allowedChildrenHint: "li elements." }),
  item("li", "List item", "lists-and-tables", "Item inside a list.", "element", "li", { allowedInsertionModes: SIBLING_INSERTION_MODES }),
  item("table", "Table", "lists-and-tables", "Tabular data table.", "element", "table"),
  item("thead", "Table head", "lists-and-tables", "Table header row group.", "element", "thead", { allowedChildrenHint: "tr elements." }),
  item("tbody", "Table body", "lists-and-tables", "Table body row group.", "element", "tbody", { allowedChildrenHint: "tr elements." }),
  item("tr", "Table row", "lists-and-tables", "Table row.", "element", "tr", { allowedChildrenHint: "th or td elements." }),
  item("th", "Header cell", "lists-and-tables", "Table header cell.", "element", "th", { recommendedAttributes: ["scope"] }),
  item("td", "Data cell", "lists-and-tables", "Table data cell.", "element", "td"),
  item("caption", "Caption", "lists-and-tables", "Table caption text.", "element", "caption", { allowedInsertionModes: INSIDE_INSERTION_MODE }),

  item("details", "Details", "interaction", "Disclosure container.", "element", "details", { allowedChildrenHint: "summary followed by flow content." }),
  item("summary", "Summary", "interaction", "Disclosure label.", "element", "summary", { allowedInsertionModes: SIBLING_INSERTION_MODES }),
  item("dialog", "Dialog", "interaction", "Native dialog container.", "element", "dialog", { accessibilityNotes: "Requires explicit focus management when implemented." }),

  item("landmark-nav", "Navigation landmark", "semantic-accessibility", "Accessible nav helper preset.", "accessibility-helper", "nav", { recommendedAttributes: ["aria-label"] }),
  item("landmark-main", "Main landmark", "semantic-accessibility", "Accessible main landmark helper.", "accessibility-helper", "main"),
  item("landmark-aside", "Aside landmark", "semantic-accessibility", "Complementary landmark helper.", "accessibility-helper", "aside", { recommendedAttributes: ["aria-label"] }),
  item("accessible-button", "Accessible button", "semantic-accessibility", "Button helper with naming guidance.", "accessibility-helper", "button", { recommendedAttributes: ["type", "aria-label"], accessibilityNotes: "Use aria-label only when visible text cannot name the button." }),
  item("labelled-input", "Labelled input", "semantic-accessibility", "Label and input relationship helper.", "accessibility-helper", "input", { requiredAttributes: ["id"], recommendedAttributes: ["name", "type"] }),

  item("hero-section", "Hero section", "presets", "Hero block composition placeholder.", "preset"),
  item("card", "Card", "presets", "Content card composition placeholder.", "preset"),
  item("navbar", "Navbar", "presets", "Navigation bar composition placeholder.", "preset"),
  item("footer-preset", "Footer preset", "presets", "Footer composition placeholder.", "preset"),
  item("product-grid", "Product grid", "presets", "Product listing grid placeholder.", "preset"),
  item("modal", "Modal", "presets", "Dialog composition placeholder.", "preset"),
  item("form-group", "Form group", "presets", "Label/control group placeholder.", "preset"),
  item("cta-block", "CTA block", "presets", "Call-to-action section placeholder.", "preset"),
  item("gallery", "Gallery", "presets", "Image gallery composition placeholder.", "preset"),
  item("menu-section", "Menu section", "presets", "Menu/product section placeholder.", "preset")
];

export function getHtmlElementLibraryCategories(): readonly HtmlElementLibraryCategoryDefinition[] {
  return HTML_ELEMENT_LIBRARY_CATEGORIES;
}

export function getHtmlElementLibraryItems(): readonly HtmlElementLibraryItem[] {
  return HTML_ELEMENT_LIBRARY_CATALOG;
}

export function getHtmlElementLibraryItemsByCategory(category: HtmlElementLibraryCategory): readonly HtmlElementLibraryItem[] {
  return HTML_ELEMENT_LIBRARY_CATALOG.filter((catalogItem) => catalogItem.category === category);
}

export function findHtmlElementLibraryItem(elementId: string): HtmlElementLibraryItem | null {
  return HTML_ELEMENT_LIBRARY_CATALOG.find((catalogItem) => catalogItem.id === elementId) ?? null;
}

export function validateHtmlElementLibraryCatalog(items: readonly HtmlElementLibraryItem[] = HTML_ELEMENT_LIBRARY_CATALOG): HtmlElementLibraryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<string>();
  const categoryIds = new Set(HTML_ELEMENT_LIBRARY_CATEGORIES.map((category) => category.id));

  for (const catalogItem of items) {
    if (!catalogItem.id.trim()) errors.push("Catalog item id is required.");
    if (seenIds.has(catalogItem.id)) errors.push(`Duplicate catalog item id: ${catalogItem.id}`);
    seenIds.add(catalogItem.id);
    if (!catalogItem.label.trim()) errors.push(`Catalog item ${catalogItem.id} is missing a label.`);
    if (!categoryIds.has(catalogItem.category)) errors.push(`Catalog item ${catalogItem.id} has an unknown category.`);
    if (!catalogItem.description.trim()) errors.push(`Catalog item ${catalogItem.id} is missing a description.`);
    if (catalogItem.allowedInsertionModes.length === 0) errors.push(`Catalog item ${catalogItem.id} has no allowed insertion modes.`);
    if (catalogItem.isImplemented !== false) errors.push(`Catalog item ${catalogItem.id} must remain read-only in this phase.`);
    if (catalogItem.kind === "element" && !catalogItem.tagName) warnings.push(`Element item ${catalogItem.id} has no tagName metadata.`);
  }

  for (const category of HTML_ELEMENT_LIBRARY_CATEGORIES) {
    if (!items.some((catalogItem) => catalogItem.category === category.id)) errors.push(`Catalog category has no items: ${category.id}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function selectHtmlInsertionTargetEligibility(input: HtmlInsertionTargetEligibilityInput): HtmlInsertionTargetEligibility {
  if (!input.projectGraph) return state("no-project", "No project", "Open a project before selecting an insertion target.");
  if (!input.preview?.target) return state("no-preview-target", "No preview target", "Load or select an HTML preview target.");
  if (!input.previewSelection?.selectedNode) return state("no-selection", "No selection", "Select a node in Preview selection mode.");
  if (!input.domSnapshot?.currentDomSnapshot) return state("missing-snapshot", "Missing snapshot", "Build a DOM Snapshot before insertion can be planned.");
  if (input.domSnapshot.isStale || input.domSnapshot.status === "stale" || input.previewSelection.mappingStatus === "stale") return state("stale-snapshot", "Stale snapshot", "Rebuild the DOM Snapshot before planning insertion.");
  if (input.previewSelection.mappingStatus === "missing-snapshot") return state("missing-snapshot", "Missing snapshot", "Selection mapping has no current DOM Snapshot.");
  if (input.previewSelection.mappingStatus === "ambiguous") return state("ambiguous-selection", "Ambiguous selection", input.previewSelection.mappingReason ?? "Multiple DOM Snapshot nodes could match the selection.");
  if (input.previewSelection.mappingStatus === "mismatched") return state("mismatched-selection", "Mismatched selection", input.previewSelection.mappingReason ?? "Preview selection does not match the current DOM Snapshot.");
  if (input.previewSelection.mappingStatus !== "matched" || !input.previewSelection.mappedSnapshotPath) return state("unsupported-target", "Unsupported target", "Selection mapping is not matched yet.");
  if (input.preview.target.relativePath !== input.domSnapshot.currentDomSnapshot.rootRelativePath) return state("mismatched-selection", "Mismatched selection", "Preview target and DOM Snapshot target differ.");

  const targetNode = findDomSnapshotNodeByPath(input.domSnapshot.currentDomSnapshot.rootNode, input.previewSelection.mappedSnapshotPath);
  if (!targetNode) return state("mismatched-selection", "Mismatched selection", "Mapped DOM Snapshot path was not found.");
  if (targetNode.type !== "element" || !targetNode.tagName) return state("unsupported-target", "Unsupported target", "Only element nodes can be future insertion targets.");

  const normalizedTagName = targetNode.tagName.toLowerCase();
  const canInsertInside = !VOID_TAG_NAMES.has(normalizedTagName);
  return {
    state: "matched-target",
    label: "Matched target",
    reason: canInsertInside ? "Selection maps to a current DOM Snapshot element." : `${normalizedTagName} is a void element; inside insertion is unavailable.`,
    targetTagName: normalizedTagName,
    targetSnapshotPath: targetNode.snapshotPath,
    targetFilePath: input.preview.target.relativePath,
    canInsertBefore: true,
    canInsertAfter: true,
    canInsertInside
  };
}

export function findDomSnapshotNodeByPath(node: ProjectDomNode, snapshotPath: string): ProjectDomNode | null {
  if (node.snapshotPath === snapshotPath) return node;
  for (const child of node.children) {
    const match = findDomSnapshotNodeByPath(child, snapshotPath);
    if (match) return match;
  }
  return null;
}

function item(
  id: string,
  label: string,
  category: HtmlElementLibraryCategory,
  description: string,
  kind: HtmlElementLibraryItemKind,
  tagName?: string,
  options: Partial<Omit<HtmlElementLibraryItem, "id" | "label" | "category" | "description" | "kind" | "tagName" | "isImplemented">> = {}
): HtmlElementLibraryItem {
  return {
    id,
    label,
    category,
    description,
    kind,
    tagName,
    allowedInsertionModes: options.allowedInsertionModes ?? ALL_INSERTION_MODES,
    requiredAttributes: options.requiredAttributes,
    recommendedAttributes: options.recommendedAttributes,
    allowedChildrenHint: options.allowedChildrenHint,
    accessibilityNotes: options.accessibilityNotes,
    isImplemented: false
  };
}

function state(stateCode: Exclude<HtmlInsertionTargetStateCode, "matched-target">, label: string, reason: string): HtmlInsertionTargetEligibility {
  return {
    state: stateCode,
    label,
    reason,
    canInsertBefore: false,
    canInsertAfter: false,
    canInsertInside: false
  };
}
