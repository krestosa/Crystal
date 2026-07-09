import {
  STYLE_ENGINE_READONLY_SAFETY_NOTE,
  STYLE_SOURCE_BLOCKED_STATUS,
  STYLE_SOURCE_DISCOVERED_STATUS,
  STYLE_SOURCE_KIND_INLINE_STYLE_ATTRIBUTE,
  STYLE_SOURCE_KIND_INLINE_STYLE_BLOCK,
  STYLE_SOURCE_KIND_LINKED_CSS,
  STYLE_SOURCE_KIND_LINKED_SCSS,
  STYLE_SOURCE_KIND_UNKNOWN,
  STYLE_SOURCE_UNSUPPORTED_STATUS
} from "./style-engine.constants";
import type { StyleSourceKind, StyleSourceReferencePreview, StyleSourceReferencePreviewInput, StyleSourceStatus } from "./style-engine.types";
import { validateStyleSourceReferencePreview } from "./style-engine.validators";

export function createStyleSourceReferencePreview(input: StyleSourceReferencePreviewInput): StyleSourceReferencePreview {
  const relativePath = normalizeStyleSourcePath(input.relativePath);
  const sourceKind = input.sourceKind ?? detectStyleSourceKindFromPath(relativePath);
  const status = input.status ?? resolveSourceStatus(sourceKind, input.blockedReason);
  const canReadSource = input.canReadSource ?? resolveCanReadSource(sourceKind, status);

  const preview: StyleSourceReferencePreview = {
    sourceId: input.sourceId.trim(),
    sourceKind,
    relativePath: relativePath || undefined,
    ownerHtmlRelativePath: normalizeStyleSourcePath(input.ownerHtmlRelativePath) || undefined,
    media: input.media?.trim() || undefined,
    loadOrder: input.loadOrder ?? 0,
    status,
    canReadSource,
    canWriteSource: false,
    blockedReason: input.blockedReason?.trim() || undefined,
    safetyNotes: [STYLE_ENGINE_READONLY_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateStyleSourceReferencePreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function detectStyleSourceKindFromPath(relativePath: string | undefined): StyleSourceKind {
  const path = normalizeStyleSourcePath(relativePath).toLowerCase();
  if (!path) return STYLE_SOURCE_KIND_UNKNOWN;
  if (path.endsWith(".css")) return STYLE_SOURCE_KIND_LINKED_CSS;
  if (path.endsWith(".scss") || path.endsWith(".sass")) return STYLE_SOURCE_KIND_LINKED_SCSS;
  return STYLE_SOURCE_KIND_UNKNOWN;
}

export function normalizeStyleSourcePath(value: string | undefined): string {
  return (value ?? "").trim().replace(/\\/g, "/");
}

export function createInlineStyleBlockReferencePreview(input: {
  readonly sourceId: string;
  readonly ownerHtmlRelativePath: string;
  readonly loadOrder: number;
  readonly safetyNotes?: readonly string[];
}): StyleSourceReferencePreview {
  return createStyleSourceReferencePreview({
    sourceId: input.sourceId,
    sourceKind: STYLE_SOURCE_KIND_INLINE_STYLE_BLOCK,
    ownerHtmlRelativePath: input.ownerHtmlRelativePath,
    loadOrder: input.loadOrder,
    status: STYLE_SOURCE_DISCOVERED_STATUS,
    canReadSource: true,
    safetyNotes: input.safetyNotes
  });
}

export function createInlineStyleAttributeReferencePreview(input: {
  readonly sourceId: string;
  readonly ownerHtmlRelativePath: string;
  readonly loadOrder: number;
  readonly safetyNotes?: readonly string[];
}): StyleSourceReferencePreview {
  return createStyleSourceReferencePreview({
    sourceId: input.sourceId,
    sourceKind: STYLE_SOURCE_KIND_INLINE_STYLE_ATTRIBUTE,
    ownerHtmlRelativePath: input.ownerHtmlRelativePath,
    loadOrder: input.loadOrder,
    status: STYLE_SOURCE_DISCOVERED_STATUS,
    canReadSource: false,
    safetyNotes: input.safetyNotes
  });
}

function resolveSourceStatus(sourceKind: StyleSourceKind, blockedReason: string | undefined): StyleSourceStatus {
  if (blockedReason?.trim()) return STYLE_SOURCE_BLOCKED_STATUS;
  if (sourceKind === STYLE_SOURCE_KIND_UNKNOWN) return STYLE_SOURCE_UNSUPPORTED_STATUS;
  return STYLE_SOURCE_DISCOVERED_STATUS;
}

function resolveCanReadSource(sourceKind: StyleSourceKind, status: StyleSourceStatus): boolean {
  if (status !== STYLE_SOURCE_DISCOVERED_STATUS) return false;
  return sourceKind === STYLE_SOURCE_KIND_LINKED_CSS || sourceKind === STYLE_SOURCE_KIND_INLINE_STYLE_BLOCK;
}
