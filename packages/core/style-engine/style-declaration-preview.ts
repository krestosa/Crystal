import { STYLE_DECLARATION_PARSED_STATUS, STYLE_ENGINE_READONLY_SAFETY_NOTE } from "./style-engine.constants";
import type { StyleDeclarationPreview, StyleDeclarationPreviewInput, StyleDeclarationPriority } from "./style-engine.types";
import { validateStyleDeclarationPreview } from "./style-engine.validators";

export function createStyleDeclarationPreview(input: StyleDeclarationPreviewInput): StyleDeclarationPreview {
  const preview: StyleDeclarationPreview = {
    declarationId: input.declarationId.trim(),
    propertyName: input.propertyName.trim(),
    propertyValue: input.propertyValue.trim(),
    priority: input.priority ?? inferDeclarationPriority(input.propertyValue),
    status: input.status ?? STYLE_DECLARATION_PARSED_STATUS,
    canEdit: false,
    canApply: false,
    safetyNotes: [STYLE_ENGINE_READONLY_SAFETY_NOTE, ...(input.safetyNotes ?? [])]
  };

  const validation = validateStyleDeclarationPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function parseStyleDeclarationText(input: {
  readonly declarationId: string;
  readonly declarationText: string;
  readonly safetyNotes?: readonly string[];
}): StyleDeclarationPreview | null {
  const separatorIndex = input.declarationText.indexOf(":");
  if (separatorIndex < 1) return null;

  const propertyName = input.declarationText.slice(0, separatorIndex).trim();
  const rawPropertyValue = input.declarationText.slice(separatorIndex + 1).trim();
  if (!propertyName || !rawPropertyValue) return null;

  const priority = inferDeclarationPriority(rawPropertyValue);
  const propertyValue = removeImportantSuffix(rawPropertyValue);

  return createStyleDeclarationPreview({
    declarationId: input.declarationId,
    propertyName,
    propertyValue,
    priority,
    safetyNotes: input.safetyNotes
  });
}

export function inferDeclarationPriority(propertyValue: string): StyleDeclarationPriority {
  return /!important\s*$/i.test(propertyValue.trim()) ? "important" : "normal";
}

export function removeImportantSuffix(propertyValue: string): string {
  return propertyValue.trim().replace(/!important\s*$/i, "").trim();
}
