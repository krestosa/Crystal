import type { ProjectDomNode } from "../project/dom/project-dom-snapshot.types";
import type {
  SelectedNodeStyleReadinessPreview,
  StyleDeclarationPreview,
  StyleRulePreview,
  StyleSelectorKind,
  StyleSelectorPreview
} from "./style-engine.types";

export type AuthoredStyleSnapshotNodeType = ProjectDomNode["type"] | "unknown";

export interface AuthoredStyleSnapshotAttributePreview {
  readonly name: string;
  readonly value: string | null;
}

export interface AuthoredStyleSnapshotNodePreview {
  readonly snapshotPath: string;
  readonly tagName: string | null;
  readonly idAttribute: string | null;
  readonly classList: readonly string[];
  readonly attributes: readonly AuthoredStyleSnapshotAttributePreview[];
  readonly nodeType: AuthoredStyleSnapshotNodeType;
  readonly canReadFromDomSnapshot: boolean;
  readonly canReadFromIframe: false;
  readonly safetyNotes: readonly string[];
}

export interface AuthoredStyleSnapshotNodePreviewInput {
  readonly snapshotPath?: string;
  readonly tagName?: string | null;
  readonly attributes?: readonly AuthoredStyleSnapshotAttributePreview[];
  readonly nodeType?: AuthoredStyleSnapshotNodeType;
  readonly safetyNotes?: readonly string[];
}

export interface SupportedAuthoredAttributeSelectorPreview {
  readonly name: string;
  readonly value?: string;
}

export interface SupportedSingleNodeSelectorPreview {
  readonly tagName?: string;
  readonly idAttribute?: string;
  readonly classNames: readonly string[];
  readonly attributes: readonly SupportedAuthoredAttributeSelectorPreview[];
}

export type AuthoredSelectorMatchStatus =
  | "matched-from-snapshot"
  | "not-matched-from-snapshot"
  | "unsupported-selector"
  | "not-evaluated"
  | "inventory-unavailable"
  | "source-text-unavailable"
  | "blocked";

export interface AuthoredSelectorMatchPreview {
  readonly selectorMatchId: string;
  readonly selectorId: string;
  readonly sourceId: string;
  readonly selectorText: string;
  readonly selectorKind: StyleSelectorPreview["selectorKind"];
  readonly status: AuthoredSelectorMatchStatus;
  readonly matched: boolean;
  readonly unsupportedReason?: string;
  readonly evidence: readonly string[];
  readonly canEvaluateAgainstDomSnapshot: boolean;
  readonly canEvaluateAgainstIframe: false;
  readonly canInspectComputedStyles: false;
  readonly canEdit: false;
  readonly canApply: false;
  readonly safetyNotes: readonly string[];
}

export interface AuthoredSelectorMatchPreviewInput {
  readonly selectorMatchId?: string;
  readonly selectorId: string;
  readonly sourceId: string;
  readonly selectorText: string;
  readonly selectorKind: StyleSelectorKind;
  readonly status?: AuthoredSelectorMatchStatus;
  readonly matched?: boolean;
  readonly unsupportedReason?: string;
  readonly evidence?: readonly string[];
  readonly canEvaluateAgainstDomSnapshot?: boolean;
  readonly safetyNotes?: readonly string[];
}

export interface AuthoredStyleRuleMatchCandidatePreview {
  readonly candidateId: string;
  readonly ruleId: string;
  readonly sourceId: string;
  readonly selectorMatches: readonly AuthoredSelectorMatchPreview[];
  readonly declarationPreviews: readonly StyleDeclarationPreview[];
  readonly status: AuthoredSelectorMatchStatus;
  readonly matchedSelectorCount: number;
  readonly unsupportedSelectorCount: number;
  readonly notMatchedSelectorCount: number;
  readonly canInspectComputedStyles: false;
  readonly canEdit: false;
  readonly canApply: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface AuthoredStyleRuleMatchCandidatePreviewInput {
  readonly candidateId?: string;
  readonly ruleId: string;
  readonly sourceId: string;
  readonly selectorMatches?: readonly AuthoredSelectorMatchPreview[];
  readonly declarationPreviews?: readonly StyleDeclarationPreview[];
  readonly status?: AuthoredSelectorMatchStatus;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export type SelectedNodeAuthoredStyleMatchesStatus = "matched" | "no-matches" | "partial" | "unsupported" | "blocked" | "empty";

export interface AuthoredStyleMatchCandidateSummary {
  readonly status: SelectedNodeAuthoredStyleMatchesStatus;
  readonly matchedCandidateCount: number;
  readonly unsupportedCandidateCount: number;
  readonly notMatchedCandidateCount: number;
  readonly totalCandidateCount: number;
}

export interface SelectedNodeAuthoredStyleMatchesPreview {
  readonly matchingId: string;
  readonly selectedNodePath: string;
  readonly targetRelativePath: string;
  readonly snapshotNodePreview: AuthoredStyleSnapshotNodePreview | null;
  readonly candidates: readonly AuthoredStyleRuleMatchCandidatePreview[];
  readonly status: SelectedNodeAuthoredStyleMatchesStatus;
  readonly matchedCandidateCount: number;
  readonly unsupportedCandidateCount: number;
  readonly notMatchedCandidateCount: number;
  readonly totalCandidateCount: number;
  readonly canInspectAuthoredStyles: boolean;
  readonly canInspectComputedStyles: false;
  readonly canEditStyles: false;
  readonly canApply: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface SelectedNodeAuthoredStyleMatchesPreviewInput {
  readonly matchingId: string;
  readonly selectedNodePath?: string;
  readonly targetRelativePath?: string;
  readonly readinessPreview?: SelectedNodeStyleReadinessPreview | null;
  readonly snapshotNodePreview?: AuthoredStyleSnapshotNodePreview | null;
  readonly rulePreviews?: readonly StyleRulePreview[];
  readonly candidates?: readonly AuthoredStyleRuleMatchCandidatePreview[];
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export interface BlockedSelectedNodeAuthoredStyleMatchesPreviewInput {
  readonly matchingId: string;
  readonly selectedNodePath?: string;
  readonly targetRelativePath?: string;
  readonly snapshotNodePreview?: AuthoredStyleSnapshotNodePreview | null;
  readonly blockedReason: string;
  readonly safetyNotes?: readonly string[];
}
