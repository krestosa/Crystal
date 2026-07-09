import {
  AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS,
  AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS,
  AUTHORED_SELECTOR_UNSUPPORTED_STATUS,
  STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON,
  STYLE_AUTHORED_MATCHING_NO_COMPUTED_STYLES_NOTE,
  STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE,
  STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE
} from "./style-engine.constants";
import type { StyleSelectorPreview } from "./style-engine.types";
import type {
  AuthoredSelectorMatchPreview,
  AuthoredSelectorMatchPreviewInput,
  SupportedAuthoredAttributeSelectorPreview,
  SupportedSingleNodeSelectorPreview,
  AuthoredStyleSnapshotNodePreview
} from "./style-authored-matching.types";
import { getSnapshotAttributeValue } from "./style-authored-snapshot-node";
import { normalizeStyleEngineStringList, validateAuthoredSelectorMatchPreview } from "./style-engine.validators";

export function createAuthoredSelectorMatchPreview(input: AuthoredSelectorMatchPreviewInput): AuthoredSelectorMatchPreview {
  const status = input.status ?? (input.matched ? AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS : AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS);
  const preview: AuthoredSelectorMatchPreview = {
    selectorMatchId: input.selectorMatchId?.trim() || `authored-selector-match:${input.sourceId}:${input.selectorId}`,
    selectorId: input.selectorId.trim(),
    sourceId: input.sourceId.trim(),
    selectorText: input.selectorText.trim(),
    selectorKind: input.selectorKind,
    status,
    matched: status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS,
    unsupportedReason: input.unsupportedReason?.trim() || undefined,
    evidence: normalizeEvidence(input.evidence ?? []),
    canEvaluateAgainstDomSnapshot: input.canEvaluateAgainstDomSnapshot ?? status !== AUTHORED_SELECTOR_UNSUPPORTED_STATUS,
    canEvaluateAgainstIframe: false,
    canInspectComputedStyles: false,
    canEdit: false,
    canApply: false,
    safetyNotes: normalizeStyleEngineStringList(
      [
        STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE,
        STYLE_AUTHORED_MATCHING_NO_COMPUTED_STYLES_NOTE,
        STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE,
        STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON,
        ...(input.safetyNotes ?? [])
      ],
      "safetyNotes"
    )
  };

  const validation = validateAuthoredSelectorMatchPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function matchStyleSelectorPreviewAgainstSnapshotNode(
  selectorPreview: StyleSelectorPreview,
  snapshotNodePreview: AuthoredStyleSnapshotNodePreview
): AuthoredSelectorMatchPreview {
  const selectorText = selectorPreview.selectorText.trim();
  if (!selectorText) {
    return createAuthoredSelectorMatchPreview({
      selectorId: selectorPreview.selectorId,
      sourceId: selectorPreview.sourceId,
      selectorText,
      selectorKind: selectorPreview.selectorKind,
      status: AUTHORED_SELECTOR_UNSUPPORTED_STATUS,
      unsupportedReason: "Empty selectors cannot be matched from DOM Snapshot data.",
      canEvaluateAgainstDomSnapshot: false,
      safetyNotes: selectorPreview.safetyNotes
    });
  }

  const unsupportedReason = getUnsupportedSelectorReason(selectorText);
  if (unsupportedReason) {
    return createAuthoredSelectorMatchPreview({
      selectorId: selectorPreview.selectorId,
      sourceId: selectorPreview.sourceId,
      selectorText,
      selectorKind: selectorPreview.selectorKind,
      status: AUTHORED_SELECTOR_UNSUPPORTED_STATUS,
      unsupportedReason,
      canEvaluateAgainstDomSnapshot: false,
      safetyNotes: selectorPreview.safetyNotes
    });
  }

  const parsedSelector = parseSupportedSingleNodeSelector(selectorText);
  if (!parsedSelector) {
    return createAuthoredSelectorMatchPreview({
      selectorId: selectorPreview.selectorId,
      sourceId: selectorPreview.sourceId,
      selectorText,
      selectorKind: selectorPreview.selectorKind,
      status: AUTHORED_SELECTOR_UNSUPPORTED_STATUS,
      unsupportedReason: "Selector syntax is outside the Phase 8C single-node matcher.",
      canEvaluateAgainstDomSnapshot: false,
      safetyNotes: selectorPreview.safetyNotes
    });
  }

  const matchResult = matchParsedSelector(parsedSelector, snapshotNodePreview);
  return createAuthoredSelectorMatchPreview({
    selectorId: selectorPreview.selectorId,
    sourceId: selectorPreview.sourceId,
    selectorText,
    selectorKind: selectorPreview.selectorKind,
    status: matchResult.matched ? AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS : AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS,
    matched: matchResult.matched,
    evidence: matchResult.evidence,
    safetyNotes: selectorPreview.safetyNotes
  });
}

export function parseSupportedSingleNodeSelector(selectorText: string): SupportedSingleNodeSelectorPreview | null {
  const selector = selectorText.trim();
  if (!selector || isUnsupportedAuthoredSelector(selector)) return null;

  let remaining = selector;
  let tagName: string | undefined;
  let idAttribute: string | undefined;
  const classNames: string[] = [];
  const attributes: SupportedAuthoredAttributeSelectorPreview[] = [];

  const tagMatch = remaining.match(/^[A-Za-z][\w-]*/);
  if (tagMatch) {
    tagName = tagMatch[0].toLowerCase();
    remaining = remaining.slice(tagMatch[0].length);
  }

  while (remaining.length > 0) {
    const classMatch = remaining.match(/^\.([A-Za-z_-][\w-]*)/);
    if (classMatch) {
      classNames.push(classMatch[1]);
      remaining = remaining.slice(classMatch[0].length);
      continue;
    }

    const idMatch = remaining.match(/^#([A-Za-z_-][\w-]*)/);
    if (idMatch) {
      if (idAttribute) return null;
      idAttribute = idMatch[1];
      remaining = remaining.slice(idMatch[0].length);
      continue;
    }

    if (remaining.startsWith("[")) {
      const closingIndex = remaining.indexOf("]");
      if (closingIndex < 0) return null;
      const token = remaining.slice(0, closingIndex + 1);
      const attribute = parseAttributeSelector(token);
      if (!attribute) return null;
      attributes.push(attribute);
      remaining = remaining.slice(token.length);
      continue;
    }

    return null;
  }

  if (!tagName && !idAttribute && classNames.length === 0 && attributes.length === 0) return null;
  return {
    tagName,
    idAttribute,
    classNames: [...new Set(classNames)],
    attributes
  };
}

export function isUnsupportedAuthoredSelector(selectorText: string): boolean {
  return Boolean(getUnsupportedSelectorReason(selectorText));
}

function getUnsupportedSelectorReason(selectorText: string): string | undefined {
  const selector = selectorText.trim();
  if (!selector) return "Empty selector.";
  if (selector.includes(",")) return "Selector lists are already split before matching and cannot be matched as one selector.";
  if (/\s/.test(selector)) return "Whitespace combinators require a future selector engine.";
  if (/[>+~]/.test(selector)) return "Combinators require a future selector engine.";
  if (selector.includes(":")) return "Pseudo selectors require a future selector engine.";
  if (selector.includes("*")) return "Universal selectors are outside Phase 8C.";
  return undefined;
}

function parseAttributeSelector(token: string): SupportedAuthoredAttributeSelectorPreview | null {
  const match = token.match(/^\[\s*([A-Za-z_:][\w:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*)?\]$/);
  if (!match) return null;
  const value = match[2] ?? match[3] ?? match[4];
  return {
    name: match[1].toLowerCase(),
    value: value === undefined ? undefined : value.trim()
  };
}

function matchParsedSelector(
  parsedSelector: SupportedSingleNodeSelectorPreview,
  snapshotNodePreview: AuthoredStyleSnapshotNodePreview
): { readonly matched: boolean; readonly evidence: readonly string[] } {
  const evidence: string[] = [];
  if (snapshotNodePreview.nodeType !== "element") {
    return {
      matched: false,
      evidence: [`DOM Snapshot node type ${snapshotNodePreview.nodeType} is not an element.`]
    };
  }

  if (parsedSelector.tagName) {
    if (snapshotNodePreview.tagName !== parsedSelector.tagName) {
      evidence.push(`tag ${parsedSelector.tagName} missing on snapshot node`);
    } else {
      evidence.push(`tag ${parsedSelector.tagName} matched`);
    }
  }

  if (parsedSelector.idAttribute) {
    if (snapshotNodePreview.idAttribute !== parsedSelector.idAttribute) {
      evidence.push(`id ${parsedSelector.idAttribute} missing on snapshot node`);
    } else {
      evidence.push(`id ${parsedSelector.idAttribute} matched`);
    }
  }

  for (const className of parsedSelector.classNames) {
    if (snapshotNodePreview.classList.includes(className)) evidence.push(`class ${className} matched`);
    else evidence.push(`class ${className} missing on snapshot node`);
  }

  for (const attribute of parsedSelector.attributes) {
    const snapshotValue = getSnapshotAttributeValue(snapshotNodePreview, attribute.name);
    if (snapshotValue === undefined) {
      evidence.push(`attribute ${attribute.name} missing on snapshot node`);
      continue;
    }
    if (attribute.value === undefined) {
      evidence.push(`attribute ${attribute.name} present`);
      continue;
    }
    if (snapshotValue === attribute.value) evidence.push(`attribute ${attribute.name} equals ${attribute.value}`);
    else evidence.push(`attribute ${attribute.name} does not equal ${attribute.value}`);
  }

  const matched = evidence.length > 0 && evidence.every((entry) => !entry.includes(" missing ") && !entry.includes(" does not equal "));
  return { matched, evidence };
}

function normalizeEvidence(values: readonly string[]): readonly string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const text = value.trim();
    if (text) normalized.add(text);
  }
  return [...normalized];
}
