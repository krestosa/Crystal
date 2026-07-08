import type { CommandTransactionPlanPreview } from "../commands/transaction-planning";
import type { DesignEditingReadinessPreview } from "../design-editing";

export type InspectorEditableFieldKind = "text-content" | "attribute" | "tag-name" | "class-list" | "inline-style";
export type InspectorEditableFieldStatus = "readonly" | "draftable" | "blocked" | "unsupported";

export interface InspectorEditableFieldPreview {
  readonly fieldId: string;
  readonly nodePath: string;
  readonly fieldKind: InspectorEditableFieldKind;
  readonly label: string;
  readonly currentValue: string;
  readonly draftValue: string;
  readonly status: InspectorEditableFieldStatus;
  readonly canDraft: boolean;
  readonly canApply: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface InspectorEditableFieldPreviewInput {
  readonly fieldId: string;
  readonly nodePath: string;
  readonly fieldKind: InspectorEditableFieldKind;
  readonly label: string;
  readonly currentValue?: string;
  readonly draftValue?: string;
  readonly canDraft?: boolean;
  readonly status?: InspectorEditableFieldStatus;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export type InspectorEditDraftStatus = "empty" | "draft-preview" | "blocked" | "unsupported";

export interface InspectorEditDraftPreview {
  readonly draftId: string;
  readonly selectedNodePath: string;
  readonly snapshotVersion: string;
  readonly status: InspectorEditDraftStatus;
  readonly fields: readonly InspectorEditableFieldPreview[];
  readonly changedFieldIds: readonly string[];
  readonly affectedFiles: readonly string[];
  readonly sourcePatchPreviewId?: string;
  readonly transactionPlanPreviewId?: string;
  readonly readinessPreviewId?: string;
  readonly applyAvailable: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface InspectorEditDraftPreviewInput {
  readonly draftId: string;
  readonly selectedNodePath?: string;
  readonly snapshotVersion?: string;
  readonly fields?: readonly InspectorEditableFieldPreview[];
  readonly affectedFiles?: readonly string[];
  readonly sourcePatchPreviewId?: string;
  readonly transactionPlanPreviewId?: string;
  readonly readinessPreviewId?: string;
  readonly trustedSelection?: boolean;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export type InspectorEditIntentKind = "update-text" | "set-attribute" | "remove-attribute" | "unsupported";
export type InspectorEditIntentStatus = "preview-only" | "blocked" | "unsupported";

export interface InspectorEditIntentPreview {
  readonly intentId: string;
  readonly intentKind: InspectorEditIntentKind;
  readonly targetNodePath: string;
  readonly attributeName?: string;
  readonly currentValue: string;
  readonly nextValue?: string;
  readonly status: InspectorEditIntentStatus;
  readonly requiresSourceLocation: true;
  readonly canCreateSourcePatchPreview: boolean;
  readonly canApply: false;
  readonly blockedReason?: string;
  readonly safetyNotes: readonly string[];
}

export interface InspectorEditIntentPreviewInput {
  readonly intentId: string;
  readonly intentKind: InspectorEditIntentKind;
  readonly targetNodePath?: string;
  readonly attributeName?: string;
  readonly currentValue?: string;
  readonly nextValue?: string;
  readonly hasSourceLocation?: boolean;
  readonly blockedReason?: string;
  readonly safetyNotes?: readonly string[];
}

export type InspectorEditingReadinessStatus = "blocked" | "preview-only" | "unsupported";

export interface InspectorEditingReadinessPreview {
  readonly readinessId: string;
  readonly status: InspectorEditingReadinessStatus;
  readonly selectedNodePath: string;
  readonly draftPreview: InspectorEditDraftPreview;
  readonly intentPreviews: readonly InspectorEditIntentPreview[];
  readonly commandTransactionPlanPreview?: CommandTransactionPlanPreview;
  readonly designEditingReadinessPreview?: DesignEditingReadinessPreview;
  readonly applyAvailable: false;
  readonly applyBlockedReason: string;
  readonly missingRequirements: readonly string[];
  readonly safetyNotes: readonly string[];
}

export interface InspectorEditingReadinessPreviewInput {
  readonly readinessId: string;
  readonly selectedNodePath?: string;
  readonly draftPreview: InspectorEditDraftPreview;
  readonly intentPreviews?: readonly InspectorEditIntentPreview[];
  readonly commandTransactionPlanPreview?: CommandTransactionPlanPreview;
  readonly designEditingReadinessPreview?: DesignEditingReadinessPreview;
  readonly trustedSelection?: boolean;
  readonly hasSourceLocation?: boolean;
  readonly safetyNotes?: readonly string[];
}

export interface InspectorEditingValidationResult<TPreview> {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly normalizedPreview?: TPreview;
}
