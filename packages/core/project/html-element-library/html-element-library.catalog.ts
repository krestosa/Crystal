import { HTML_ELEMENT_INSERTION_MODES, HTML_ELEMENT_INSIDE_INSERTION_MODE, HTML_ELEMENT_SIBLING_INSERTION_MODES } from "./html-element-library.constants";
import type { HtmlElementLibraryCategory, HtmlElementLibraryItem, HtmlElementLibraryItemKind } from "./html-element-library.types";

type HtmlElementLibraryItemOptions = Partial<Omit<HtmlElementLibraryItem, "id" | "label" | "category" | "description" | "kind" | "tagName" | "isImplemented">>;

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
  item("span", "Span", "text", "Generic inline text wrapper.", "element", "span", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),
  item("blockquote", "Blockquote", "text", "Quoted block-level content.", "element", "blockquote", { recommendedAttributes: ["cite"] }),
  item("code", "Code", "text", "Inline code fragment.", "element", "code", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),
  item("pre", "Preformatted", "text", "Preformatted text block.", "element", "pre"),
  item("strong", "Strong", "text", "Strong importance inline text.", "element", "strong", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),
  item("em", "Emphasis", "text", "Emphasized inline text.", "element", "em", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),
  item("small", "Small", "text", "Side comments or fine print.", "element", "small", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),

  item("img", "Image", "media", "Image resource.", "element", "img", { requiredAttributes: ["src", "alt"], allowedChildrenHint: "Void element." }),
  item("picture", "Picture", "media", "Responsive image wrapper.", "element", "picture", { allowedChildrenHint: "source elements followed by img." }),
  item("source", "Source", "media", "Media source candidate.", "element", "source", { requiredAttributes: ["srcset"], allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES, allowedChildrenHint: "Void element." }),
  item("video", "Video", "media", "Video player element.", "element", "video", { recommendedAttributes: ["controls"] }),
  item("audio", "Audio", "media", "Audio player element.", "element", "audio", { recommendedAttributes: ["controls"] }),
  item("svg", "SVG", "media", "Inline vector graphics root.", "element", "svg", { recommendedAttributes: ["viewBox"], accessibilityNotes: "Name meaningful graphics or hide decorative ones." }),
  item("canvas", "Canvas", "media", "Scriptable drawing surface.", "element", "canvas", { accessibilityNotes: "Provide fallback text or an accessible alternative." }),

  item("form", "Form", "forms", "Form submission container.", "element", "form"),
  item("label", "Label", "forms", "Form field label.", "element", "label", { recommendedAttributes: ["for"] }),
  item("input", "Input", "forms", "Single-line form control.", "element", "input", { recommendedAttributes: ["type", "name"], allowedChildrenHint: "Void element." }),
  item("textarea", "Textarea", "forms", "Multi-line text input.", "element", "textarea", { recommendedAttributes: ["name"] }),
  item("select", "Select", "forms", "Option picker control.", "element", "select", { allowedChildrenHint: "option or optgroup elements." }),
  item("option", "Option", "forms", "Selectable option.", "element", "option", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),
  item("button", "Button", "forms", "Clickable form or UI button.", "element", "button", { recommendedAttributes: ["type"], accessibilityNotes: "Buttons need an accessible name." }),
  item("fieldset", "Fieldset", "forms", "Group related form controls.", "element", "fieldset"),
  item("legend", "Legend", "forms", "Caption for a fieldset.", "element", "legend", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),

  item("ul", "Unordered list", "lists-and-tables", "Bulleted list.", "element", "ul", { allowedChildrenHint: "li elements." }),
  item("ol", "Ordered list", "lists-and-tables", "Numbered list.", "element", "ol", { allowedChildrenHint: "li elements." }),
  item("li", "List item", "lists-and-tables", "Item inside a list.", "element", "li", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),
  item("table", "Table", "lists-and-tables", "Tabular data table.", "element", "table"),
  item("thead", "Table head", "lists-and-tables", "Table header row group.", "element", "thead", { allowedChildrenHint: "tr elements." }),
  item("tbody", "Table body", "lists-and-tables", "Table body row group.", "element", "tbody", { allowedChildrenHint: "tr elements." }),
  item("tr", "Table row", "lists-and-tables", "Table row.", "element", "tr", { allowedChildrenHint: "th or td elements." }),
  item("th", "Header cell", "lists-and-tables", "Table header cell.", "element", "th", { recommendedAttributes: ["scope"] }),
  item("td", "Data cell", "lists-and-tables", "Table data cell.", "element", "td"),
  item("caption", "Caption", "lists-and-tables", "Table caption text.", "element", "caption", { allowedInsertionModes: HTML_ELEMENT_INSIDE_INSERTION_MODE }),

  item("details", "Details", "interaction", "Disclosure container.", "element", "details", { allowedChildrenHint: "summary followed by flow content." }),
  item("summary", "Summary", "interaction", "Disclosure label.", "element", "summary", { allowedInsertionModes: HTML_ELEMENT_SIBLING_INSERTION_MODES }),
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

function item(
  id: string,
  label: string,
  category: HtmlElementLibraryCategory,
  description: string,
  kind: HtmlElementLibraryItemKind,
  tagName?: string,
  options: HtmlElementLibraryItemOptions = {}
): HtmlElementLibraryItem {
  return {
    id,
    label,
    category,
    description,
    kind,
    tagName,
    allowedInsertionModes: options.allowedInsertionModes ?? HTML_ELEMENT_INSERTION_MODES,
    requiredAttributes: options.requiredAttributes,
    recommendedAttributes: options.recommendedAttributes,
    allowedChildrenHint: options.allowedChildrenHint,
    accessibilityNotes: options.accessibilityNotes,
    isImplemented: false
  };
}
