import {
  STYLE_ENGINE_READONLY_SAFETY_NOTE,
  STYLE_INVENTORY_BLOCKED_STATUS,
  STYLE_INVENTORY_DISCOVERED_STATUS,
  STYLE_INVENTORY_EMPTY_STATUS,
  STYLE_INVENTORY_PARTIAL_STATUS,
  STYLE_SOURCE_DISCOVERED_STATUS,
  STYLE_SOURCE_KIND_LINKED_CSS,
  STYLE_SOURCE_KIND_LINKED_SCSS,
  STYLE_SOURCE_KIND_UNKNOWN,
  STYLE_SOURCE_UNAVAILABLE_STATUS,
  STYLE_SOURCE_UNSUPPORTED_STATUS
} from "./style-engine.constants";
import type {
  StyleSourceInventoryPreview,
  StyleSourceInventoryPreviewInput,
  StyleSourceInventoryStatus,
  StyleSourceReferencePreview
} from "./style-engine.types";
import { validateStyleSourceInventoryPreview } from "./style-engine.validators";
import {
  createInlineStyleAttributeReferencePreview,
  createInlineStyleBlockReferencePreview,
  createStyleSourceReferencePreview,
  detectStyleSourceKindFromPath,
  normalizeStyleSourcePath
} from "./style-source-reference";

export function createStyleSourceInventoryPreview(input: StyleSourceInventoryPreviewInput): StyleSourceInventoryPreview {
  const discoveredSources = discoverStyleSourceReferencesFromHtml({
    ownerHtmlRelativePath: input.targetRelativePath,
    htmlSourceText: input.htmlSourceText
  });
  const sources = [...(input.sources ?? []), ...discoveredSources].sort((a, b) => a.loadOrder - b.loadOrder);
  const inlineStyleBlockCount = countInlineStyleBlocks(input.htmlSourceText) + sources.filter((source) => source.sourceKind === "inline-style-block").length;
  const inlineStyleAttributeCount = countInlineStyleAttributes(input.htmlSourceText) + sources.filter((source) => source.sourceKind === "inline-style-attribute").length;
  const linkedStylesheetCount = sources.filter((source) => source.sourceKind === STYLE_SOURCE_KIND_LINKED_CSS || source.sourceKind === STYLE_SOURCE_KIND_LINKED_SCSS).length;
  const unsupportedSourceCount = sources.filter((source) => source.status === STYLE_SOURCE_UNSUPPORTED_STATUS).length;
  const missingSourceCount = sources.filter((source) => source.status === STYLE_SOURCE_UNAVAILABLE_STATUS).length;
  const status = resolveInventoryStatus({
    blockedReason: input.blockedReason,
    sourceCount: sources.length,
    inlineStyleBlockCount,
    inlineStyleAttributeCount,
    unsupportedSourceCount,
    missingSourceCount
  });

  const preview: StyleSourceInventoryPreview = {
    inventoryId: input.inventoryId.trim(),
    targetRelativePath: normalizeStyleSourcePath(input.targetRelativePath),
    status,
    sources,
    inlineStyleBlockCount,
    inlineStyleAttributeCount,
    linkedStylesheetCount,
    unsupportedSourceCount,
    missingSourceCount,
    generatedAtMarker: input.generatedAtMarker?.trim() || undefined,
    canEdit: false,
    canApply: false,
    blockedReason: input.blockedReason?.trim() || undefined,
    safetyNotes: [STYLE_ENGINE_READONLY_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateStyleSourceInventoryPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function discoverStyleSourceReferencesFromHtml(input: {
  readonly ownerHtmlRelativePath: string;
  readonly htmlSourceText?: string;
}): readonly StyleSourceReferencePreview[] {
  const htmlSourceText = input.htmlSourceText ?? "";
  if (!htmlSourceText.trim()) return [];

  const ownerHtmlRelativePath = normalizeStyleSourcePath(input.ownerHtmlRelativePath);
  const sources: StyleSourceReferencePreview[] = [];
  let loadOrder = 0;

  for (const linkTag of htmlSourceText.matchAll(/<link\b[^>]*>/gi)) {
    const tag = linkTag[0];
    const rel = readHtmlAttribute(tag, "rel").toLowerCase();
    if (!rel.split(/\s+/).includes("stylesheet")) continue;

    const href = readHtmlAttribute(tag, "href");
    const media = readHtmlAttribute(tag, "media") || undefined;
    const sourceKind = href ? detectStyleSourceKindFromPath(href) : STYLE_SOURCE_KIND_UNKNOWN;
    const status = href ? (sourceKind === STYLE_SOURCE_KIND_UNKNOWN ? STYLE_SOURCE_UNSUPPORTED_STATUS : STYLE_SOURCE_DISCOVERED_STATUS) : STYLE_SOURCE_UNAVAILABLE_STATUS;

    sources.push(
      createStyleSourceReferencePreview({
        sourceId: createStyleSourceId(ownerHtmlRelativePath, "linked", loadOrder, href || "missing-href"),
        sourceKind,
        relativePath: href || undefined,
        ownerHtmlRelativePath,
        media,
        loadOrder,
        status,
        canReadSource: false
      })
    );
    loadOrder += 1;
  }

  let inlineBlockIndex = 0;
  for (const _styleBlock of htmlSourceText.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)) {
    sources.push(
      createInlineStyleBlockReferencePreview({
        sourceId: createStyleSourceId(ownerHtmlRelativePath, "inline-block", loadOrder, String(inlineBlockIndex)),
        ownerHtmlRelativePath,
        loadOrder
      })
    );
    loadOrder += 1;
    inlineBlockIndex += 1;
  }

  let inlineAttributeIndex = 0;
  for (const _styleAttribute of htmlSourceText.matchAll(/\sstyle\s*=/gi)) {
    sources.push(
      createInlineStyleAttributeReferencePreview({
        sourceId: createStyleSourceId(ownerHtmlRelativePath, "inline-attribute", loadOrder, String(inlineAttributeIndex)),
        ownerHtmlRelativePath,
        loadOrder
      })
    );
    loadOrder += 1;
    inlineAttributeIndex += 1;
  }

  return sources;
}

export function countInlineStyleBlocks(htmlSourceText: string | undefined): number {
  return [...(htmlSourceText ?? "").matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].length;
}

export function countInlineStyleAttributes(htmlSourceText: string | undefined): number {
  return [...(htmlSourceText ?? "").matchAll(/\sstyle\s*=/gi)].length;
}

function resolveInventoryStatus(input: {
  readonly blockedReason?: string;
  readonly sourceCount: number;
  readonly inlineStyleBlockCount: number;
  readonly inlineStyleAttributeCount: number;
  readonly unsupportedSourceCount: number;
  readonly missingSourceCount: number;
}): StyleSourceInventoryStatus {
  if (input.blockedReason?.trim()) return STYLE_INVENTORY_BLOCKED_STATUS;
  if (input.sourceCount === 0 && input.inlineStyleBlockCount === 0 && input.inlineStyleAttributeCount === 0) return STYLE_INVENTORY_EMPTY_STATUS;
  if (input.unsupportedSourceCount > 0 || input.missingSourceCount > 0) return STYLE_INVENTORY_PARTIAL_STATUS;
  return STYLE_INVENTORY_DISCOVERED_STATUS;
}

function readHtmlAttribute(tag: string, attributeName: string): string {
  const match = tag.match(new RegExp(`\\b${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function createStyleSourceId(ownerHtmlRelativePath: string, kind: string, loadOrder: number, value: string): string {
  const normalizedOwner = normalizeStyleSourcePath(ownerHtmlRelativePath) || "unknown-html";
  const normalizedValue = normalizeStyleSourcePath(value) || "unknown-source";
  return `style-source:${normalizedOwner}:${kind}:${loadOrder}:${normalizedValue}`;
}
