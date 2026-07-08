import type { ProjectDomAttribute } from "../project/dom/project-dom-snapshot.types";
import type {
  ProjectPreviewInspectorSnapshotNodeDetails,
  ProjectPreviewInspectorViewModel
} from "../project/preview-inspector/project-preview-inspector.types";
import { createInspectorEditDraftPreview } from "./inspector-editing.draft";
import { createInspectorEditableFieldPreview } from "./inspector-editing.fields";
import { createInspectorAttributeSetIntentPreview, createInspectorTextEditIntentPreview } from "./inspector-editing.intent";
import { createInspectorEditingReadinessPreview } from "./inspector-editing.readiness";
import type {
  InspectorEditableFieldPreview,
  InspectorEditDraftPreview,
  InspectorEditIntentPreview,
  InspectorEditingReadinessPreview
} from "./inspector-editing.types";

export interface InspectorEditingReadOnlySurfaceInput {
  readonly inspector: ProjectPreviewInspectorViewModel;
  readonly snapshotVersion?: string;
}

export interface InspectorEditingReadOnlySurfaceViewModel {
  readonly title: "Editable Inspector Preview";
  readonly trustedSelection: boolean;
  readonly message: string;
  readonly draftPreview: InspectorEditDraftPreview;
  readonly intentPreviews: readonly InspectorEditIntentPreview[];
  readonly readinessPreview: InspectorEditingReadinessPreview;
  readonly applyLabel: "Apply unavailable — write runtime not enabled";
  readonly applyDisabled: true;
}

export function selectInspectorEditingReadOnlySurfaceViewModel(input: InspectorEditingReadOnlySurfaceInput): InspectorEditingReadOnlySurfaceViewModel {
  const trustedSelection = input.inspector.status === "mapped" && !!input.inspector.snapshotNode;
  const snapshotNode = trustedSelection ? input.inspector.snapshotNode : null;
  const selectedNodePath = snapshotNode?.snapshotPath ?? input.inspector.selectedNode?.mappedSnapshotPath ?? input.inspector.selectedNode?.snapshotPath ?? "";
  const fields = snapshotNode ? createEditableInspectorFields(snapshotNode) : [];
  const intentPreviews = snapshotNode ? createEditableInspectorIntentPreviews(snapshotNode) : [];
  const draftPreview = createInspectorEditDraftPreview({
    draftId: "editable-inspector-read-only-draft",
    selectedNodePath,
    snapshotVersion: input.snapshotVersion ?? "unknown",
    fields,
    trustedSelection,
    blockedReason: trustedSelection ? undefined : "Editable Inspector surface requires a trusted Preview selection mapped to a DOM Snapshot node.",
    safetyNotes: ["Phase 7B renders disabled controls only; no draft state is mutated from user input."]
  });
  const readinessPreview = createInspectorEditingReadinessPreview({
    readinessId: "editable-inspector-read-only-readiness",
    selectedNodePath,
    draftPreview,
    intentPreviews,
    trustedSelection,
    hasSourceLocation: !!snapshotNode?.sourceLocation,
    safetyNotes: ["Phase 7B keeps Apply unavailable and does not create source patches, write IPC, refresh execution, dirty-state persistence, or undo/redo execution."]
  });

  return {
    title: "Editable Inspector Preview",
    trustedSelection,
    message: trustedSelection ? "Trusted selection resolved. Future editable fields are displayed as disabled preview controls." : "Blocked: trusted selection / DOM Snapshot mapping is required before editable Inspector fields can be previewed.",
    draftPreview,
    intentPreviews,
    readinessPreview,
    applyLabel: "Apply unavailable — write runtime not enabled",
    applyDisabled: true
  };
}

function createEditableInspectorFields(node: ProjectPreviewInspectorSnapshotNodeDetails): readonly InspectorEditableFieldPreview[] {
  return [
    ...createTextField(node),
    ...node.attributes.map((attribute) => createAttributeField(node.snapshotPath, attribute)),
    createInspectorEditableFieldPreview({
      fieldId: `${node.snapshotPath}:tag-name`,
      nodePath: node.snapshotPath,
      fieldKind: "tag-name",
      label: "Tag name",
      currentValue: node.tagName ?? "",
      canDraft: false
    }),
    createInspectorEditableFieldPreview({
      fieldId: `${node.snapshotPath}:class-list`,
      nodePath: node.snapshotPath,
      fieldKind: "class-list",
      label: "Class list",
      currentValue: getAttributeValue(node.attributes, "class"),
      canDraft: false
    }),
    createInspectorEditableFieldPreview({
      fieldId: `${node.snapshotPath}:inline-style`,
      nodePath: node.snapshotPath,
      fieldKind: "inline-style",
      label: "Inline style",
      currentValue: getAttributeValue(node.attributes, "style"),
      canDraft: false
    })
  ];
}

function createTextField(node: ProjectPreviewInspectorSnapshotNodeDetails): readonly InspectorEditableFieldPreview[] {
  if (node.textPreview === null) return [];
  return [createInspectorEditableFieldPreview({
    fieldId: `${node.snapshotPath}:text-content`,
    nodePath: node.snapshotPath,
    fieldKind: "text-content",
    label: "Text content",
    currentValue: node.textPreview,
    canDraft: true
  })];
}

function createAttributeField(nodePath: string, attribute: ProjectDomAttribute): InspectorEditableFieldPreview {
  return createInspectorEditableFieldPreview({
    fieldId: `${nodePath}:attribute:${attribute.name}`,
    nodePath,
    fieldKind: "attribute",
    label: `@${attribute.name}`,
    currentValue: attribute.value ?? "",
    canDraft: true,
    safetyNotes: attribute.truncated ? [`Attribute ${attribute.name} is truncated in the DOM Snapshot.`] : []
  });
}

function createEditableInspectorIntentPreviews(node: ProjectPreviewInspectorSnapshotNodeDetails): readonly InspectorEditIntentPreview[] {
  const hasSourceLocation = !!node.sourceLocation;
  return [
    ...createTextIntent(node, hasSourceLocation),
    ...node.attributes.map((attribute) => createInspectorAttributeSetIntentPreview({
      intentId: `${node.snapshotPath}:intent:set-attribute:${attribute.name}`,
      targetNodePath: node.snapshotPath,
      attributeName: attribute.name,
      currentValue: attribute.value ?? "",
      nextValue: attribute.value ?? "",
      hasSourceLocation,
      safetyNotes: ["Preview-only intent; no patch is created and no command is executed."]
    }))
  ];
}

function createTextIntent(node: ProjectPreviewInspectorSnapshotNodeDetails, hasSourceLocation: boolean): readonly InspectorEditIntentPreview[] {
  if (node.textPreview === null) return [];
  return [createInspectorTextEditIntentPreview({
    intentId: `${node.snapshotPath}:intent:update-text`,
    targetNodePath: node.snapshotPath,
    currentValue: node.textPreview,
    nextValue: node.textPreview,
    hasSourceLocation,
    safetyNotes: ["Preview-only intent; no patch is created and no command is executed."]
  })];
}

function getAttributeValue(attributes: readonly ProjectDomAttribute[], name: string): string {
  return attributes.find((attribute) => attribute.name === name)?.value ?? "";
}
