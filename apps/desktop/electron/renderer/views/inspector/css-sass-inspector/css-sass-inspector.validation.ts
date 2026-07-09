import type { CSSSassInspectorSurfaceViewModel } from "./css-sass-inspector.types";

export interface CSSSassInspectorSurfaceValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateCSSSassInspectorSurfaceViewModel(model: CSSSassInspectorSurfaceViewModel): CSSSassInspectorSurfaceValidationResult {
  const errors: string[] = [];

  if (model.title !== "CSS/Sass Inspector") errors.push("Surface title must be CSS/Sass Inspector.");
  if (model.sourceSummary.canInspectComputedStyles !== false) errors.push("Computed style inspection must remain unavailable.");
  if (model.sourceSummary.canEditStyles !== false) errors.push("Style editing must remain unavailable.");
  if (model.sourceSummary.canApply !== false) errors.push("Apply must remain unavailable.");
  if (model.authoredMatchesSummary.canInspectComputedStyles !== false) errors.push("Authored match summary must not expose computed styles.");
  if (model.authoredMatchesSummary.canApply !== false) errors.push("Authored match summary must not expose Apply.");
  if (model.applyAffordance.label !== "Apply unavailable — style write runtime not enabled") errors.push("Apply affordance must use the Phase 8B unavailable label.");
  if (model.applyAffordance.ariaDisabled !== true) errors.push("Apply affordance must be aria-disabled.");
  if (model.applyAffordance.dataDisabled !== true) errors.push("Apply affordance must be data-disabled.");
  if (model.applyAffordance.canApply !== false) errors.push("Apply affordance must not be executable.");
  if (model.authoredMatchesPreview && model.authoredMatchesPreview.canInspectComputedStyles !== false) {
    errors.push("Selected-node authored matches must keep computed styles unavailable.");
  }
  if (model.authoredMatchesPreview && model.authoredMatchesPreview.canApply !== false) {
    errors.push("Selected-node authored matches must keep Apply unavailable.");
  }

  for (const source of model.sourceSections) {
    if (source.canWriteSource !== false) errors.push(`${source.sourceId} must keep source writes unavailable.`);
  }

  for (const rule of model.ruleSections) {
    if (rule.canEdit !== false) errors.push(`${rule.ruleId} must not expose style editing.`);
    if (rule.canApply !== false) errors.push(`${rule.ruleId} must not expose Apply.`);
  }

  for (const section of model.authoredMatchSections) {
    if (section.canEdit !== false) errors.push(`${section.candidateId} must not expose style editing.`);
    if (section.canApply !== false) errors.push(`${section.candidateId} must not expose Apply.`);
  }

  return { valid: errors.length === 0, errors };
}
