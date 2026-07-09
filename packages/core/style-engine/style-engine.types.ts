import type { InspectorEditingReadinessPreview } from "../inspector-editing";

export type StyleSourceKind = "linked-css" | "linked-scss" | "inline-style-block" | "inline-style-attribute" | "unknown";
export type StyleSourceStatus = "discovered" | "unavailable" | "unsupported" | "blocked";

export interface StyleSourceReferencePreview {
  readonly sourceId: string;
  readonly sourceKind: StyleSourceKind;
  readonly relativePath?: string;
  readonly ownerHtmlRelativePath?: string;
  readonly media?: string;
  readonly loadOrder: number;
  readonly status: StyleSourceStatus;
  readonly canReadSource: boolean;
  readonly canWriteSource: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface StyleSourceReferencePreviewInput {
  readonly sourceId: string;
  readonly sourceKind?: StyleSourceKind;
  readonly relativePath?: string;
  readonly ownerHtmlRelativePath?: string;
  readonly media?: string;
  readonly loadOrder?: number;
  readonly status?: StyleSourceStatus;
  readonly canReadSource?: boolean;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export type StyleSourceInventoryStatus = "empty" | "discovered" | "partial" | "blocked";

export interface StyleSourceInventoryPreview {
  readonly inventoryId: string;
  readonly targetRelativePath: string;
  readonly status: StyleSourceInventoryStatus;
  readonly sources: readonly StyleSourceReferencePreview[];
  readonly inlineStyleBlockCount: number;
  readonly inlineStyleAttributeCount: number;
  readonly linkedStylesheetCount: number;
  readonly unsupportedSourceCount: number;
  readonly missingSourceCount: number;
  readonly generatedAtMarker?: string;
  readonly canEdit: false;
  readonly canApply: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface StyleSourceInventoryPreviewInput {
  readonly inventoryId: string;
  readonly targetRelativePath: string;
  readonly sources?: readonly StyleSourceReferencePreview[];
  readonly htmlSourceText?: string;
  readonly generatedAtMarker?: string;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export type StyleSelectorKind = "class" | "id" | "element" | "attribute" | "compound" | "complex" | "pseudo" | "unknown";
export type StyleSelectorMatchStatus = "not-evaluated" | "unsupported" | "blocked";

export interface StyleSelectorSpecificityPreview {
  readonly idCount: number;
  readonly classAttributePseudoCount: number;
  readonly elementPseudoElementCount: number;
  readonly label: string;
}

export interface StyleSelectorPreview {
  readonly selectorId: string;
  readonly sourceId: string;
  readonly selectorText: string;
  readonly selectorKind: StyleSelectorKind;
  readonly specificityPreview?: StyleSelectorSpecificityPreview;
  readonly matchStatus: StyleSelectorMatchStatus;
  readonly canEvaluateAgainstDomSnapshot: boolean;
  readonly canEvaluateAgainstIframe: false;
  readonly safetyNotes: readonly string[];
}

export interface StyleSelectorPreviewInput {
  readonly selectorId: string;
  readonly sourceId: string;
  readonly selectorText: string;
  readonly selectorKind?: StyleSelectorKind;
  readonly specificityPreview?: StyleSelectorSpecificityPreview;
  readonly matchStatus?: StyleSelectorMatchStatus;
  readonly canEvaluateAgainstDomSnapshot?: boolean;
  readonly safetyNotes?: readonly string[];
}

export type StyleDeclarationPriority = "normal" | "important";
export type StyleDeclarationStatus = "parsed" | "unsupported" | "blocked";

export interface StyleDeclarationPreview {
  readonly declarationId: string;
  readonly propertyName: string;
  readonly propertyValue: string;
  readonly priority: StyleDeclarationPriority;
  readonly status: StyleDeclarationStatus;
  readonly canEdit: false;
  readonly canApply: false;
  readonly safetyNotes: readonly string[];
}

export interface StyleDeclarationPreviewInput {
  readonly declarationId: string;
  readonly propertyName: string;
  readonly propertyValue: string;
  readonly priority?: StyleDeclarationPriority;
  readonly status?: StyleDeclarationStatus;
  readonly safetyNotes?: readonly string[];
}

export interface StyleSourceRangePreview {
  readonly startOffset: number;
  readonly endOffset: number;
}

export type StyleRuleStatus = "parsed" | "partial" | "unsupported" | "blocked";

export interface StyleRulePreview {
  readonly ruleId: string;
  readonly sourceId: string;
  readonly selectorPreviews: readonly StyleSelectorPreview[];
  readonly declarationPreviews: readonly StyleDeclarationPreview[];
  readonly sourceRange?: StyleSourceRangePreview;
  readonly status: StyleRuleStatus;
  readonly canEdit: false;
  readonly canApply: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface StyleRulePreviewInput {
  readonly ruleId: string;
  readonly sourceId: string;
  readonly selectorPreviews?: readonly StyleSelectorPreview[];
  readonly declarationPreviews?: readonly StyleDeclarationPreview[];
  readonly sourceRange?: StyleSourceRangePreview;
  readonly status?: StyleRuleStatus;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export type SelectedNodeStyleReadinessStatus = "blocked" | "inventory-only" | "unsupported";

export interface SelectedNodeStyleReadinessPreview {
  readonly readinessId: string;
  readonly selectedNodePath: string;
  readonly targetRelativePath: string;
  readonly inventoryPreview: StyleSourceInventoryPreview;
  readonly inspectorEditingReadinessPreview?: InspectorEditingReadinessPreview;
  readonly status: SelectedNodeStyleReadinessStatus;
  readonly canInspectComputedStyles: false;
  readonly canInspectAuthoredStyles: boolean;
  readonly canEditStyles: false;
  readonly canApply: false;
  readonly missingRequirements: readonly string[];
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface SelectedNodeStyleReadinessPreviewInput {
  readonly readinessId: string;
  readonly selectedNodePath?: string;
  readonly targetRelativePath?: string;
  readonly inventoryPreview: StyleSourceInventoryPreview;
  readonly inspectorEditingReadinessPreview?: InspectorEditingReadinessPreview;
  readonly trustedSelection?: boolean;
  readonly hasDomSnapshot?: boolean;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export interface StyleEngineValidationResult<TPreview> {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: TPreview;
}
