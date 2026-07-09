import type { ProjectDomNode } from "../project/dom/project-dom-snapshot.types";
import {
  STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE,
  STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE
} from "./style-engine.constants";
import type {
  AuthoredStyleSnapshotAttributePreview,
  AuthoredStyleSnapshotNodePreview,
  AuthoredStyleSnapshotNodePreviewInput,
  AuthoredStyleSnapshotNodeType
} from "./style-authored-matching.types";
import { normalizeStyleEngineStringList, validateAuthoredStyleSnapshotNodePreview } from "./style-engine.validators";

export function createAuthoredStyleSnapshotNodePreview(input: AuthoredStyleSnapshotNodePreviewInput): AuthoredStyleSnapshotNodePreview {
  const attributes = normalizeSnapshotAttributes(input.attributes ?? []);
  const preview: AuthoredStyleSnapshotNodePreview = {
    snapshotPath: normalizeSnapshotText(input.snapshotPath ?? ""),
    tagName: normalizeOptionalTagName(input.tagName),
    idAttribute: getNormalizedAttributeValue(attributes, "id") ?? null,
    classList: normalizeSnapshotClassList(getNormalizedAttributeValue(attributes, "class") ?? ""),
    attributes,
    nodeType: normalizeSnapshotNodeType(input.nodeType),
    canReadFromDomSnapshot: true,
    canReadFromIframe: false,
    safetyNotes: normalizeStyleEngineStringList(
      [STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE, STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE, ...(input.safetyNotes ?? [])],
      "safetyNotes"
    )
  };

  const validation = validateAuthoredStyleSnapshotNodePreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function createAuthoredStyleSnapshotNodePreviewFromProjectDomNode(node: ProjectDomNode): AuthoredStyleSnapshotNodePreview {
  return createAuthoredStyleSnapshotNodePreview({
    snapshotPath: node.snapshotPath,
    tagName: node.tagName,
    nodeType: node.type,
    attributes: node.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value })),
    safetyNotes: ["Plain ProjectDomNode data only; no HTMLElement, Document, or live Preview DOM object is accepted."]
  });
}

export function getSnapshotAttributeValue(
  nodePreview: AuthoredStyleSnapshotNodePreview,
  attributeName: string
): string | null | undefined {
  return getNormalizedAttributeValue(nodePreview.attributes, attributeName);
}

export function normalizeSnapshotClassList(value: string | null | undefined): readonly string[] {
  const classes = new Set<string>();
  for (const token of (value ?? "").split(/\s+/)) {
    const normalized = token.trim();
    if (normalized) classes.add(normalized);
  }
  return [...classes].sort();
}

function normalizeSnapshotAttributes(
  attributes: readonly AuthoredStyleSnapshotAttributePreview[]
): readonly AuthoredStyleSnapshotAttributePreview[] {
  const normalized = new Map<string, AuthoredStyleSnapshotAttributePreview>();
  for (const attribute of attributes) {
    const name = normalizeAttributeName(attribute.name);
    if (!name || normalized.has(name)) continue;
    normalized.set(name, { name, value: normalizeOptionalAttributeValue(attribute.value) });
  }
  return [...normalized.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function getNormalizedAttributeValue(
  attributes: readonly AuthoredStyleSnapshotAttributePreview[],
  attributeName: string
): string | null | undefined {
  const normalizedName = normalizeAttributeName(attributeName);
  return attributes.find((attribute) => attribute.name === normalizedName)?.value;
}

function normalizeSnapshotNodeType(value: AuthoredStyleSnapshotNodeType | undefined): AuthoredStyleSnapshotNodeType {
  if (value === "document" || value === "element" || value === "text" || value === "comment" || value === "doctype") return value;
  return "unknown";
}

function normalizeOptionalTagName(value: string | null | undefined): string | null {
  const normalized = normalizeSnapshotText(value ?? "").toLowerCase();
  return normalized || null;
}

function normalizeAttributeName(value: string): string {
  return normalizeSnapshotText(value).toLowerCase();
}

function normalizeOptionalAttributeValue(value: string | null): string | null {
  if (value === null) return null;
  return normalizeSnapshotText(value);
}

function normalizeSnapshotText(value: string): string {
  return value.trim();
}
