import { STYLE_ENGINE_READONLY_SAFETY_NOTE } from "./style-engine.constants";
import type {
  StyleSelectorKind,
  StyleSelectorPreview,
  StyleSelectorPreviewInput,
  StyleSelectorSpecificityPreview
} from "./style-engine.types";
import { validateStyleSelectorPreview } from "./style-engine.validators";

export function createStyleSelectorPreview(input: StyleSelectorPreviewInput): StyleSelectorPreview {
  const selectorText = input.selectorText.trim();
  const preview: StyleSelectorPreview = {
    selectorId: input.selectorId.trim(),
    sourceId: input.sourceId.trim(),
    selectorText,
    selectorKind: input.selectorKind ?? inferSelectorKind(selectorText),
    specificityPreview: input.specificityPreview ?? createSpecificityPreview(selectorText),
    matchStatus: input.matchStatus ?? "not-evaluated",
    canEvaluateAgainstDomSnapshot: input.canEvaluateAgainstDomSnapshot ?? true,
    canEvaluateAgainstIframe: false,
    safetyNotes: [STYLE_ENGINE_READONLY_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateStyleSelectorPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function inferSelectorKind(selectorText: string): StyleSelectorKind {
  const selector = selectorText.trim();
  if (!selector) return "unknown";
  if (selector.includes(",") || /\s|>|\+|~/.test(selector)) return "complex";
  if (/^\.[A-Za-z_-][\w-]*$/.test(selector)) return "class";
  if (/^#[A-Za-z_-][\w-]*$/.test(selector)) return "id";
  if (/^\[[^\]]+\]$/.test(selector)) return "attribute";
  if (/^:{1,2}[A-Za-z_-][\w-]*(?:\([^)]*\))?$/.test(selector)) return "pseudo";
  if (/^[A-Za-z][\w-]*$/.test(selector)) return "element";
  if (/[.#[:]/.test(selector)) return "compound";
  return "unknown";
}

export function createSpecificityPreview(selectorText: string): StyleSelectorSpecificityPreview | undefined {
  const selector = selectorText.trim();
  if (!selector || selector.includes(",")) return undefined;

  const idCount = (selector.match(/#[A-Za-z_-][\w-]*/g) ?? []).length;
  const classCount = (selector.match(/\.[A-Za-z_-][\w-]*/g) ?? []).length;
  const attributeCount = (selector.match(/\[[^\]]+\]/g) ?? []).length;
  const pseudoCount = (selector.match(/:[A-Za-z_-][\w-]*(?:\([^)]*\))?/g) ?? []).filter((token) => !token.startsWith("::")).length;
  const pseudoElementCount = (selector.match(/::[A-Za-z_-][\w-]*/g) ?? []).length;
  const withoutSelectorDecorators = selector
    .replace(/#[A-Za-z_-][\w-]*/g, " ")
    .replace(/\.[A-Za-z_-][\w-]*/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/:{1,2}[A-Za-z_-][\w-]*(?:\([^)]*\))?/g, " ")
    .replace(/[>+~*]/g, " ");
  const elementCount = (withoutSelectorDecorators.match(/\b[A-Za-z][\w-]*\b/g) ?? []).length;
  const classAttributePseudoCount = classCount + attributeCount + pseudoCount;
  const elementPseudoElementCount = elementCount + pseudoElementCount;

  return {
    idCount,
    classAttributePseudoCount,
    elementPseudoElementCount,
    label: `${idCount}-${classAttributePseudoCount}-${elementPseudoElementCount}`
  };
}
