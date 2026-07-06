import type { ProjectPreviewInspectorInput } from "../../../../../../../packages/core/project/preview-inspector/project-preview-inspector-selector";
import { selectProjectPreviewInspectorViewModel } from "../../../../../../../packages/core/project/preview-inspector/project-preview-inspector-selector";
import type { ProjectPreviewInspectorSelectedNodeDetails, ProjectPreviewInspectorSnapshotNodeDetails } from "../../../../../../../packages/core/project/preview-inspector/project-preview-inspector.types";
import type { ProjectDomAttribute, ProjectDomSourceLocation } from "../../../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectPreviewSelectedNodeAttribute } from "../../../../../../../packages/core/project/preview-selection/project-preview-selection.types";

export interface ProjectPreviewInspectorRendererElements {
  readonly inspectorStatus: HTMLElement;
  readonly inspectorMessage: HTMLElement;
  readonly inspectorSelectedDetails: HTMLDListElement;
  readonly inspectorSnapshotDetails: HTMLDListElement;
  readonly inspectorSnapshotEmpty: HTMLElement;
}

export function renderProjectPreviewInspector(elements: ProjectPreviewInspectorRendererElements, input: ProjectPreviewInspectorInput): void {
  const viewModel = selectProjectPreviewInspectorViewModel(input);
  elements.inspectorStatus.textContent = viewModel.status;
  elements.inspectorMessage.textContent = viewModel.message;
  renderSelectedDetails(elements.inspectorSelectedDetails, viewModel.selectedNode);
  renderSnapshotDetails(elements.inspectorSnapshotDetails, elements.inspectorSnapshotEmpty, viewModel.snapshotNode);
}

function renderSelectedDetails(container: HTMLDListElement, selectedNode: ProjectPreviewInspectorSelectedNodeDetails | null): void {
  if (!selectedNode) {
    container.replaceChildren(createDetailRow("Selection", "none"));
    return;
  }

  container.replaceChildren(
    createDetailRow("Selected", `<${selectedNode.tagName}> · ${selectedNode.snapshotPath}`),
    createDetailRow("Mapping", renderMapping(selectedNode)),
    createDetailRow("Selector", selectedNode.selectorPreview || "none"),
    createDetailRow("Text", selectedNode.textPreview || "none"),
    createDetailRow("Attributes", renderSelectedAttributes(selectedNode.attributesPreview))
  );
}

function renderSnapshotDetails(container: HTMLDListElement, empty: HTMLElement, snapshotNode: ProjectPreviewInspectorSnapshotNodeDetails | null): void {
  empty.hidden = !!snapshotNode;
  if (!snapshotNode) {
    container.replaceChildren();
    return;
  }

  container.replaceChildren(
    createDetailRow("Node type", snapshotNode.type),
    createDetailRow("Tag", snapshotNode.tagName ?? "none"),
    createDetailRow("snapshotPath", snapshotNode.snapshotPath),
    createDetailRow("Depth", String(snapshotNode.depth)),
    createDetailRow("Sibling", String(snapshotNode.siblingIndex)),
    createDetailRow("Children", String(snapshotNode.childCount)),
    createDetailRow("Text", snapshotNode.textPreview ?? "none"),
    createDetailRow("Attributes", renderSnapshotAttributes(snapshotNode.attributes)),
    createDetailRow("Source", renderSourceLocation(snapshotNode.sourceLocation)),
    createDetailRow("Truncated", snapshotNode.truncated ? "yes" : "no")
  );
}

function renderMapping(selectedNode: ProjectPreviewInspectorSelectedNodeDetails): string {
  const mappedPath = selectedNode.mappedSnapshotPath ?? "none";
  const reason = selectedNode.mappingReason ?? "none";
  return `${selectedNode.mappingStatus} · ${mappedPath} · ${reason}`;
}

function renderSelectedAttributes(attributes: readonly ProjectPreviewSelectedNodeAttribute[]): string {
  if (attributes.length === 0) return "none";
  return attributes.map((attribute) => attribute.value === null ? attribute.name : `${attribute.name}=\"${attribute.value}\"`).join(" ");
}

function renderSnapshotAttributes(attributes: readonly ProjectDomAttribute[]): string {
  if (attributes.length === 0) return "none";
  return attributes.map((attribute) => {
    const value = attribute.value === null ? attribute.name : `${attribute.name}=\"${attribute.value}\"`;
    return attribute.truncated ? `${value} … truncated` : value;
  }).join(" ");
}

function renderSourceLocation(sourceLocation: ProjectDomSourceLocation | null): string {
  if (!sourceLocation) return "none";
  return `line ${sourceLocation.line}, column ${sourceLocation.column}, offset ${sourceLocation.offset}`;
}

function createDetailRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  row.append(term, description);
  return row;
}
