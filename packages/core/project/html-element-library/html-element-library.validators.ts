import { HTML_ELEMENT_LIBRARY_CATALOG } from "./html-element-library.catalog";
import { HTML_ELEMENT_LIBRARY_CATEGORIES } from "./html-element-library.constants";
import type { HtmlElementLibraryItem, HtmlElementLibraryValidationResult } from "./html-element-library.types";

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
