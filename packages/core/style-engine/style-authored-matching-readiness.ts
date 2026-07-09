import {
  AUTHORED_STYLE_MATCHING_BLOCKED_STATUS,
  STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON,
  STYLE_AUTHORED_MATCHING_NO_CASCADE_NOTE,
  STYLE_AUTHORED_MATCHING_NO_COMPUTED_STYLES_NOTE,
  STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE,
  STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE
} from "./style-engine.constants";
import type {
  AuthoredStyleMatchCandidateSummary,
  AuthoredStyleRuleMatchCandidatePreview,
  BlockedSelectedNodeAuthoredStyleMatchesPreviewInput,
  SelectedNodeAuthoredStyleMatchesPreview,
  SelectedNodeAuthoredStyleMatchesPreviewInput,
  SelectedNodeAuthoredStyleMatchesStatus
} from "./style-authored-matching.types";
import { matchStyleRulePreviewsAgainstSnapshotNode } from "./style-authored-rule-match";
import { normalizeStyleEngineStringList, validateSelectedNodeAuthoredStyleMatchesPreview } from "./style-engine.validators";

export function createSelectedNodeAuthoredStyleMatchesPreview(
  input: SelectedNodeAuthoredStyleMatchesPreviewInput
): SelectedNodeAuthoredStyleMatchesPreview {
  const readinessPreview = input.readinessPreview ?? null;
  const snapshotNodePreview = input.snapshotNodePreview ?? null;
  const selectedNodePath = normalizeMatchingPath(input.selectedNodePath ?? readinessPreview?.selectedNodePath ?? snapshotNodePreview?.snapshotPath ?? "");
  const targetRelativePath = normalizeMatchingPath(input.targetRelativePath ?? readinessPreview?.targetRelativePath ?? "");
  const blockedReason = resolveBlockedReason(input.blockedReason, selectedNodePath, snapshotNodePreview, readinessPreview?.status);

  if (blockedReason) {
    return createBlockedSelectedNodeAuthoredStyleMatchesPreview({
      matchingId: input.matchingId,
      selectedNodePath,
      targetRelativePath,
      snapshotNodePreview,
      blockedReason,
      safetyNotes: input.safetyNotes
    });
  }

  const candidates = input.candidates ?? (snapshotNodePreview ? matchStyleRulePreviewsAgainstSnapshotNode(input.rulePreviews ?? [], snapshotNodePreview) : []);
  const summary = summarizeAuthoredStyleMatchCandidates(candidates);
  const preview: SelectedNodeAuthoredStyleMatchesPreview = {
    matchingId: input.matchingId.trim(),
    selectedNodePath,
    targetRelativePath,
    snapshotNodePreview,
    candidates,
    status: summary.status,
    matchedCandidateCount: summary.matchedCandidateCount,
    unsupportedCandidateCount: summary.unsupportedCandidateCount,
    notMatchedCandidateCount: summary.notMatchedCandidateCount,
    totalCandidateCount: summary.totalCandidateCount,
    canInspectAuthoredStyles: readinessPreview?.canInspectAuthoredStyles !== false && snapshotNodePreview?.nodeType === "element",
    canInspectComputedStyles: false,
    canEditStyles: false,
    canApply: false,
    safetyNotes: createMatchingSafetyNotes(input.safetyNotes)
  };

  const validation = validateSelectedNodeAuthoredStyleMatchesPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function createBlockedSelectedNodeAuthoredStyleMatchesPreview(
  input: BlockedSelectedNodeAuthoredStyleMatchesPreviewInput
): SelectedNodeAuthoredStyleMatchesPreview {
  const preview: SelectedNodeAuthoredStyleMatchesPreview = {
    matchingId: input.matchingId.trim(),
    selectedNodePath: normalizeMatchingPath(input.selectedNodePath ?? ""),
    targetRelativePath: normalizeMatchingPath(input.targetRelativePath ?? ""),
    snapshotNodePreview: input.snapshotNodePreview ?? null,
    candidates: [],
    status: AUTHORED_STYLE_MATCHING_BLOCKED_STATUS,
    matchedCandidateCount: 0,
    unsupportedCandidateCount: 0,
    notMatchedCandidateCount: 0,
    totalCandidateCount: 0,
    canInspectAuthoredStyles: false,
    canInspectComputedStyles: false,
    canEditStyles: false,
    canApply: false,
    blockedReason: input.blockedReason.trim() || "Selected-node authored style matching is blocked.",
    safetyNotes: createMatchingSafetyNotes(input.safetyNotes)
  };

  const validation = validateSelectedNodeAuthoredStyleMatchesPreview(preview);
  return validation.normalizedPreview ?? preview;
}

export function summarizeAuthoredStyleMatchCandidates(
  candidates: readonly AuthoredStyleRuleMatchCandidatePreview[]
): AuthoredStyleMatchCandidateSummary {
  const matchedCandidateCount = candidates.filter((candidate) => candidate.status === "matched-from-snapshot").length;
  const unsupportedCandidateCount = candidates.filter((candidate) => candidate.status === "unsupported-selector").length;
  const notMatchedCandidateCount = candidates.filter((candidate) => candidate.status === "not-matched-from-snapshot").length;
  const totalCandidateCount = candidates.length;
  return {
    status: resolveSelectedMatchesStatus(matchedCandidateCount, unsupportedCandidateCount, notMatchedCandidateCount, totalCandidateCount),
    matchedCandidateCount,
    unsupportedCandidateCount,
    notMatchedCandidateCount,
    totalCandidateCount
  };
}

function resolveSelectedMatchesStatus(
  matchedCandidateCount: number,
  unsupportedCandidateCount: number,
  notMatchedCandidateCount: number,
  totalCandidateCount: number
): SelectedNodeAuthoredStyleMatchesStatus {
  if (totalCandidateCount === 0) return "empty";
  if (matchedCandidateCount > 0 && (unsupportedCandidateCount > 0 || notMatchedCandidateCount > 0)) return "partial";
  if (matchedCandidateCount > 0) return "matched";
  if (unsupportedCandidateCount > 0) return "unsupported";
  if (notMatchedCandidateCount > 0) return "no-matches";
  return "empty";
}

function resolveBlockedReason(
  explicitBlockedReason: string | undefined,
  selectedNodePath: string,
  snapshotNodePreview: SelectedNodeAuthoredStyleMatchesPreviewInput["snapshotNodePreview"],
  readinessStatus: string | undefined
): string | undefined {
  if (explicitBlockedReason?.trim()) return explicitBlockedReason.trim();
  if (!selectedNodePath) return "Selected DOM Snapshot node path is required for authored style matching.";
  if (!snapshotNodePreview) return "DOM Snapshot node preview is required for authored style matching.";
  if (readinessStatus === "blocked") return "Style readiness is blocked for the selected node.";
  return undefined;
}

function createMatchingSafetyNotes(values: readonly string[] | undefined): readonly string[] {
  return normalizeStyleEngineStringList(
    [
      STYLE_AUTHORED_MATCHING_READONLY_SAFETY_NOTE,
      STYLE_AUTHORED_MATCHING_NO_CASCADE_NOTE,
      STYLE_AUTHORED_MATCHING_NO_COMPUTED_STYLES_NOTE,
      STYLE_AUTHORED_MATCHING_NO_IFRAME_DOM_NOTE,
      STYLE_AUTHORED_MATCHING_APPLY_BLOCKED_REASON,
      ...(values ?? [])
    ],
    "safetyNotes"
  );
}

function normalizeMatchingPath(value: string): string {
  return value.trim().replace(/\\/g, "/");
}
