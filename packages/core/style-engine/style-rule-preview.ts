import {
  STYLE_ENGINE_READONLY_SAFETY_NOTE,
  STYLE_RULE_PARSED_STATUS,
  STYLE_RULE_PARTIAL_STATUS,
  STYLE_RULE_UNSUPPORTED_STATUS
} from "./style-engine.constants";
import type { StyleDeclarationPreview, StyleRulePreview, StyleRulePreviewInput, StyleRuleStatus, StyleSelectorPreview } from "./style-engine.types";
import { validateStyleRulePreview } from "./style-engine.validators";
import { parseStyleDeclarationText } from "./style-declaration-preview";
import { createStyleSelectorPreview } from "./style-selector-preview";

export function createStyleRulePreview(input: StyleRulePreviewInput): StyleRulePreview {
  const selectorPreviews = input.selectorPreviews ?? [];
  const declarationPreviews = input.declarationPreviews ?? [];
  const status = input.status ?? resolveRuleStatus(selectorPreviews, declarationPreviews, input.blockedReason);

  const preview: StyleRulePreview = {
    ruleId: input.ruleId.trim(),
    sourceId: input.sourceId.trim(),
    selectorPreviews,
    declarationPreviews,
    sourceRange: input.sourceRange,
    status,
    canEdit: false,
    canApply: false,
    blockedReason: input.blockedReason?.trim() || undefined,
    safetyNotes: [STYLE_ENGINE_READONLY_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateStyleRulePreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function parseStyleRulePreviewsFromSourceText(input: {
  readonly sourceId: string;
  readonly sourceText?: string;
  readonly safetyNotes?: readonly string[];
}): readonly StyleRulePreview[] {
  const sourceText = input.sourceText ?? "";
  if (!sourceText.trim()) return [];

  const rules: StyleRulePreview[] = [];
  let index = 0;
  for (const match of sourceText.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectorText = match[1]?.trim() ?? "";
    const declarationBlock = match[2]?.trim() ?? "";
    const startOffset = match.index ?? 0;
    const endOffset = startOffset + match[0].length;
    const ruleId = `style-rule:${input.sourceId}:${index}`;
    const selectorPreviews = parseSelectorPreviews(input.sourceId, ruleId, selectorText, input.safetyNotes);
    const declarationPreviews = parseDeclarationPreviews(ruleId, declarationBlock, input.safetyNotes);
    const status = selectorText.startsWith("@") ? STYLE_RULE_UNSUPPORTED_STATUS : resolveRuleStatus(selectorPreviews, declarationPreviews);

    rules.push(
      createStyleRulePreview({
        ruleId,
        sourceId: input.sourceId,
        selectorPreviews,
        declarationPreviews,
        sourceRange: { startOffset, endOffset },
        status,
        safetyNotes: input.safetyNotes
      })
    );
    index += 1;
  }

  return rules;
}

function parseSelectorPreviews(
  sourceId: string,
  ruleId: string,
  selectorText: string,
  safetyNotes: readonly string[] | undefined
): readonly StyleSelectorPreview[] {
  return selectorText
    .split(",")
    .map((selector) => selector.trim())
    .filter(Boolean)
    .map((selector, index) =>
      createStyleSelectorPreview({
        selectorId: `${ruleId}:selector:${index}`,
        sourceId,
        selectorText: selector,
        safetyNotes
      })
    );
}

function parseDeclarationPreviews(
  ruleId: string,
  declarationBlock: string,
  safetyNotes: readonly string[] | undefined
): readonly StyleDeclarationPreview[] {
  return declarationBlock
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration, index) =>
      parseStyleDeclarationText({
        declarationId: `${ruleId}:declaration:${index}`,
        declarationText: declaration,
        safetyNotes
      })
    )
    .filter((declaration): declaration is StyleDeclarationPreview => declaration !== null);
}

function resolveRuleStatus(
  selectorPreviews: readonly StyleSelectorPreview[],
  declarationPreviews: readonly StyleDeclarationPreview[],
  blockedReason?: string
): StyleRuleStatus {
  if (blockedReason?.trim()) return "blocked";
  if (selectorPreviews.length === 0 && declarationPreviews.length === 0) return STYLE_RULE_UNSUPPORTED_STATUS;
  if (selectorPreviews.length === 0 || declarationPreviews.length === 0) return STYLE_RULE_PARTIAL_STATUS;
  return STYLE_RULE_PARSED_STATUS;
}
