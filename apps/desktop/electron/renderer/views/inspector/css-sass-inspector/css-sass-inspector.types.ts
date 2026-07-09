import type {
  SelectedNodeStyleReadinessPreview,
  StyleDeclarationPreview,
  StyleRulePreview,
  StyleSourceKind,
  StyleSourceReferencePreview,
  StyleSourceStatus
} from "../../../../../../../packages/core/style-engine";

export type CSSSassInspectorSurfaceStatus = "empty" | "inventory-only" | "blocked" | "unsupported";

export interface CSSSassInspectorSurfaceInput {
  readonly readinessPreview?: SelectedNodeStyleReadinessPreview | null;
  readonly rulePreviews?: readonly StyleRulePreview[];
}

export interface CSSSassInspectorSourceSummary {
  readonly linkedCssCount: number;
  readonly linkedScssCount: number;
  readonly inlineStyleBlockCount: number;
  readonly inlineStyleAttributeCount: number;
  readonly unsupportedSourceCount: number;
  readonly missingSourceCount: number;
  readonly totalSourceCount: number;
  readonly canInspectAuthoredStyles: boolean;
  readonly canInspectComputedStyles: false;
  readonly canEditStyles: false;
  readonly canApply: false;
}

export interface CSSSassInspectorSourceSection {
  readonly sourceId: string;
  readonly label: string;
  readonly sourceKind: StyleSourceKind;
  readonly relativePath: string;
  readonly ownerHtmlRelativePath: string;
  readonly status: StyleSourceStatus;
  readonly media: string;
  readonly loadOrder: number;
  readonly canReadSource: boolean;
  readonly canWriteSource: false;
  readonly blockedReason: string;
  readonly safetyNotes: readonly string[];
}

export interface CSSSassInspectorRuleSection {
  readonly ruleId: string;
  readonly sourceId: string;
  readonly status: StyleRulePreview["status"];
  readonly selectorLabels: readonly string[];
  readonly declarations: readonly StyleDeclarationPreview[];
  readonly canEdit: false;
  readonly canApply: false;
  readonly blockedReason: string;
  readonly safetyNotes: readonly string[];
}

export interface CSSSassInspectorApplyAffordance {
  readonly label: "Apply unavailable — style write runtime not enabled";
  readonly ariaDisabled: true;
  readonly dataDisabled: true;
  readonly canApply: false;
}

export interface CSSSassInspectorSurfaceViewModel {
  readonly surfaceId: string;
  readonly title: "CSS/Sass Inspector";
  readonly status: CSSSassInspectorSurfaceStatus;
  readonly selectedNodePath: string;
  readonly targetRelativePath: string;
  readonly sourceSummary: CSSSassInspectorSourceSummary;
  readonly sourceSections: readonly CSSSassInspectorSourceSection[];
  readonly ruleSections: readonly CSSSassInspectorRuleSection[];
  readonly safetyNotes: readonly string[];
  readonly blockedReason: string;
  readonly message: string;
  readonly applyAffordance: CSSSassInspectorApplyAffordance;
  readonly sourceInventoryPreview: SelectedNodeStyleReadinessPreview["inventoryPreview"] | null;
  readonly styleReadinessPreview: SelectedNodeStyleReadinessPreview | null;
}

export interface CSSSassInspectorSurfaceElements {
  readonly cssSassInspectorStatus: HTMLElement;
  readonly cssSassInspectorMessage: HTMLElement;
  readonly cssSassInspectorReadiness: HTMLDListElement;
  readonly cssSassInspectorSources: HTMLUListElement;
  readonly cssSassInspectorSourcesEmpty: HTMLElement;
  readonly cssSassInspectorRules: HTMLUListElement;
  readonly cssSassInspectorRulesEmpty: HTMLElement;
  readonly cssSassInspectorSafety: HTMLUListElement;
  readonly cssSassInspectorApplyUnavailableAffordance: HTMLElement;
}

export type CSSSassInspectorSourcePreview = StyleSourceReferencePreview;
