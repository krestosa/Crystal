import {
  AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS,
  AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS,
  AUTHORED_SELECTOR_SOURCE_TEXT_UNAVAILABLE_STATUS,
  AUTHORED_SELECTOR_UNSUPPORTED_STATUS,
  STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON,
  STYLE_AUTHORED_MATCHING_NO_CASCADE_NOTE,
  STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE
} from "./style-engine.constants";
import type { StyleRulePreview } from "./style-engine.types";
import type {
  AuthoredSelectorMatchPreview,
  AuthoredStyleRuleMatchCandidatePreview,
  AuthoredStyleRuleMatchCandidatePreviewInput,
  AuthoredStyleSnapshotNodePreview,
  AuthoredSelectorMatchStatus
} from "./style-authored-matching.types";
import { matchStyleSelectorPreviewAgainstSnapshotNode } from "./style-authored-selector-match";
import { normalizeStyleEngineStringList, validateAuthoredStyleRuleMatchCandidatePreview } from "./style-engine.validators";

const AUTHORED_RULE_SOURCE_TEXT_UNAVAILABLE_REASON =
  "source-text-unavailable: Rule preview unavailable because source text is not provided.";

export function createAuthoredStyleRuleMatchCandidatePreview(
  input: AuthoredStyleRuleMatchCandidatePreviewInput
): AuthoredStyleRuleMatchCandidatePreview {
  const selectorMatches = input.selectorMatches ?? [];
  const matchedSelectorCount = selectorMatches.filter((selector) => selector.status === AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS).length;
  const unsupportedSelectorCount = selectorMatches.filter((selector) => selector.status === AUTHORED_SELECTOR_UNSUPPORTED_STATUS).length;
  const notMatchedSelectorCount = selectorMatches.filter((selector) => selector.status === AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS).length;
  const status = input.status ?? resolveCandidateStatus(selectorMatches, matchedSelectorCount, unsupportedSelectorCount, notMatchedSelectorCount);
  const preview: AuthoredStyleRuleMatchCandidatePreview = {
    candidateId: input.candidateId?.trim() || `authored-rule-candidate:${input.sourceId}:${input.ruleId}`,
    ruleId: input.ruleId.trim(),
    sourceId: input.sourceId.trim(),
    selectorMatches,
    declarationPreviews: input.declarationPreviews ?? [],
    status,
    matchedSelectorCount,
    unsupportedSelectorCount,
    notMatchedSelectorCount,
    canInspectComputedStyles: false,
    canEdit: false,
    canApply: false,
    blockedReason:
      input.blockedReason?.trim() ||
      (status === AUTHORED_SELECTOR_SOURCE_TEXT_UNAVAILABLE_STATUS ? AUTHORED_RULE_SOURCE_TEXT_UNAVAILABLE_REASON : undefined),
    safetyNotes: normalizeStyleEngineStringList(
      [STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE, STYLE_AUTHORED_MATCHING_NO_CASCADE_NOTE, STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON, ...(input.safetyNotes ?? [])],
      "safetyNotes"
    )
  };

  const validation = validateAuthoredStyleRuleMatchCandidatePreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function matchStyleRulePreviewAgainstSnapshotNode(
  rulePreview: StyleRulePreview,
  snapshotNodePreview: AuthoredStyleSnapshotNodePreview
): AuthoredStyleRuleMatchCandidatePreview {
  const selectorMatches = rulePreview.selectorPreviews.map((selectorPreview) =>
    matchStyleSelectorPreviewAgainstSnapshotNode(selectorPreview, snapshotNodePreview)
  );

  return createAuthoredStyleRuleMatchCandidatePreview({
    ruleId: rulePreview.ruleId,
    sourceId: rulePreview.sourceId,
    selectorMatches,
    declarationPreviews: rulePreview.declarationPreviews,
    blockedReason: rulePreview.blockedReason,
    safetyNotes: rulePreview.safetyNotes
  });
}

export function matchStyleRulePreviewsAgainstSnapshotNode(
  rulePreviews: readonly StyleRulePreview[],
  snapshotNodePreview: AuthoredStyleSnapshotNodePreview
): readonly AuthoredStyleRuleMatchCandidatePreview[] {
  return rulePreviews.map((rulePreview) => matchStyleRulePreviewAgainstSnapshotNode(rulePreview, snapshotNodePreview));
}

function resolveCandidateStatus(
  selectorMatches: readonly AuthoredSelectorMatchPreview[],
  matchedSelectorCount: number,
  unsupportedSelectorCount: number,
  notMatchedSelectorCount: number
): AuthoredSelectorMatchStatus {
  if (selectorMatches.length === 0) return AUTHORED_SELECTOR_SOURCE_TEXT_UNAVAILABLE_STATUS;
  if (matchedSelectorCount > 0) return AUTHORED_SELECTOR_MATCHED_FROM_SNAPSHOT_STATUS;
  if (notMatchedSelectorCount > 0 && unsupportedSelectorCount === 0) return AUTHORED_SELECTOR_NOT_MATCHED_FROM_SNAPSHOT_STATUS;
  if (unsupportedSelectorCount > 0) return AUTHORED_SELECTOR_UNSUPPORTED_STATUS;
  return AUTHORED_SELECTOR_SOURCE_TEXT_UNAVAILABLE_STATUS;
}
