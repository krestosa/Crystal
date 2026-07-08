import { HTML_ELEMENT_LIBRARY_CATALOG } from "./html-element-library.catalog";
import { HTML_ELEMENT_LIBRARY_CATEGORIES } from "./html-element-library.constants";
import type { HtmlElementLibraryCategory, HtmlElementLibraryCategoryDefinition, HtmlElementLibraryItem } from "./html-element-library.types";

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
