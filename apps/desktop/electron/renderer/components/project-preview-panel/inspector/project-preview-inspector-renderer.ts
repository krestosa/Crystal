import type { ProjectDependency } from "../../../../../../../packages/core/project/graph/project-graph.types";
import type { ProjectPreviewInspectorInput } from "../../../../../../../packages/core/project/preview-inspector/project-preview-inspector-selector";
import { selectProjectPreviewInspectorViewModel } from "../../../../../../../packages/core/project/preview-inspector/project-preview-inspector-selector";
import { selectInspectorEditingReadOnlySurfaceViewModel } from "../../../../../../../packages/core/inspector-editing";
import type { ProjectPreviewInspectorSelectedNodeDetails, ProjectPreviewInspectorSnapshotNodeDetails } from "../../../../../../../packages/core/project/preview-inspector/project-preview-inspector.types";
import type { ProjectDomAttribute, ProjectDomSourceLocation } from "../../../../../../../packages/core/project/dom/project-dom-snapshot.types";
import type { ProjectPreviewSelectedNodeAttribute } from "../../../../../../../packages/core/project/preview-selection/project-preview-selection.types";
import {
  createSelectedNodeStyleReadinessPreview,
  createStyleSourceInventoryPreview,
  createStyleSourceReferencePreview,
  detectStyleSourceKindFromPath,
  type SelectedNodeStyleReadinessPreview,
  type StyleSourceReferencePreview,
  type StyleSourceStatus
} from "../../../../../../../packages/core/style-engine";
import { renderEditableInspectorSurface, type EditableInspectorSurfaceElements } from "../../../views/inspector/editable-inspector";
import {
  createCSSSassInspectorSurfaceViewModel,
  renderCSSSassInspectorSurface,
  type CSSSassInspectorSurfaceElements
} from "../../../views/inspector/css-sass-inspector";

export interface ProjectPreviewInspectorRendererElements extends EditableInspectorSurfaceElements, CSSSassInspectorSurfaceElements {
  readonly inspectorStatus: HTMLElement;
  readonly inspectorMessage: HTMLElement;
  readonly inspectorSelectedDetails: HTMLDListElement;
  readonly inspectorSnapshotDetails: HTMLDListElement;
  readonly inspectorSnapshotEmpty: HTMLElement;
}

export function renderProjectPreviewInspector(elements: ProjectPreviewInspectorRendererElements, input: ProjectPreviewInspectorInput): void {
  const viewModel = selectProjectPreviewInspectorViewModel(input);
  const editableInspectorViewModel = selectInspectorEditingReadOnlySurfaceViewModel({
    inspector: viewModel,
    snapshotVersion: input.domSnapshot.currentDomSnapshot?.id ?? "unknown"
  });
  const cssSassInspectorViewModel = createCSSSassInspectorSurfaceViewModel({
    readinessPreview: selectCSSSassInspectorReadinessPreview(input, editableInspectorViewModel.readinessPreview)
  });

  elements.inspectorStatus.textContent = viewModel.status;
  elements.inspectorMessage.textContent = viewModel.message;
  renderSelectedDetails(elements.inspectorSelectedDetails, viewModel.selectedNode);
  renderSnapshotDetails(elements.inspectorSnapshotDetails, elements.inspectorSnapshotEmpty, viewModel.snapshotNode);
  renderEditableInspectorSurface(elements, editableInspectorViewModel);
  renderCSSSassInspectorSurface(elements, cssSassInspectorViewModel);
}

function selectCSSSassInspectorReadinessPreview(
  input: ProjectPreviewInspectorInput,
  inspectorEditingReadinessPreview: Parameters<typeof createSelectedNodeStyleReadinessPreview>[0]["inspectorEditingReadinessPreview"]
): SelectedNodeStyleReadinessPreview {
  const targetRelativePath = input.preview.target?.relativePath ?? input.domSnapshot.currentDomSnapshot?.rootRelativePath ?? "";
  const selectedNodePath = input.previewSelection.mappedSnapshotPath ?? input.previewSelection.selectedNode?.snapshotPath ?? "";
  const styleSources = createStyleSourcesFromPreviewDependencies(targetRelativePath, input.preview.target?.dependencies ?? []);
  const inventoryPreview = createStyleSourceInventoryPreview({
    inventoryId: createStableId("style-inventory", targetRelativePath || "missing-target"),
    targetRelativePath,
    sources: styleSources,
    blockedReason: input.preview.target ? undefined : "No Preview target is available for CSS/Sass Inspector inventory.",
    safetyNotes: ["Phase 8B renderer uses Project Graph dependency metadata only; it does not read source files."]
  });

  return createSelectedNodeStyleReadinessPreview({
    readinessId: createStableId("style-readiness", targetRelativePath || "missing-target", selectedNodePath || "missing-selection"),
    selectedNodePath,
    targetRelativePath,
    inventoryPreview,
    inspectorEditingReadinessPreview,
    trustedSelection: input.previewSelection.mappingStatus === "matched" && !!input.previewSelection.mappedSnapshotPath,
    hasDomSnapshot: input.domSnapshot.status === "ready" && !!input.domSnapshot.currentDomSnapshot,
    blockedReason: resolveCSSSassInspectorBlockedReason(input, styleSources),
    safetyNotes: ["CSS/Sass Inspector read-only visual surface consumes Phase 8A previews without cascade or computed style inspection."]
  });
}

function createStyleSourcesFromPreviewDependencies(targetRelativePath: string, dependencies: readonly ProjectDependency[]): readonly StyleSourceReferencePreview[] {
  return dependencies.filter((dependency) => dependency.type === "stylesheet").map((dependency, index) => createStyleSourceFromDependency(targetRelativePath, dependency, index));
}

function createStyleSourceFromDependency(targetRelativePath: string, dependency: ProjectDependency, index: number): StyleSourceReferencePreview {
  const sourcePath = dependency.resolvedPath ?? dependency.normalizedSpecifier ?? dependency.rawSpecifier;
  const sourceKind = detectStyleSourceKindFromPath(sourcePath);
  const status = resolveStyleSourceStatus(dependency, sourceKind);

  return createStyleSourceReferencePreview({
    sourceId: createStableId("style-source", targetRelativePath || dependency.fromPath, String(index), sourcePath || "missing-source"),
    sourceKind,
    relativePath: sourcePath,
    ownerHtmlRelativePath: dependency.fromPath,
    loadOrder: index,
    status,
    canReadSource: false,
    blockedReason: resolveStyleSourceBlockedReason(dependency, sourceKind, status),
    safetyNotes: ["Source text is not provided to the CSS/Sass Inspector renderer surface."]
  });
}

function resolveStyleSourceStatus(dependency: ProjectDependency, sourceKind: StyleSourceReferencePreview["sourceKind"]): StyleSourceStatus {
  if (sourceKind === "linked-scss") return "unsupported";
  if (sourceKind === "unknown") return "unsupported";
  if (dependency.status !== "resolved" || dependency.isExternal) return "unavailable";
  return "discovered";
}

function resolveStyleSourceBlockedReason(
  dependency: ProjectDependency,
  sourceKind: StyleSourceReferencePreview["sourceKind"],
  status: StyleSourceStatus
): string {
  if (sourceKind === "linked-scss") return "Sass/SCSS source preview is unsupported until Sass compilation and import resolution exist.";
  if (sourceKind === "unknown") return "Style source is not parseable by the Phase 8B read-only surface.";
  if (dependency.isExternal) return "External stylesheet source text is unavailable to the renderer surface.";
  if (dependency.status !== "resolved") return `Style source dependency is ${dependency.status}.`;
  if (status === "discovered") return "Source text is not provided; rule preview remains unavailable.";
  return "Style source is unavailable.";
}

function resolveCSSSassInspectorBlockedReason(input: ProjectPreviewInspectorInput, sources: readonly StyleSourceReferencePreview[]): string | undefined {
  if (!input.preview.target) return "CSS/Sass Inspector requires a Preview target.";
  if (!input.domSnapshot.currentDomSnapshot) return "CSS/Sass Inspector requires a DOM Snapshot.";
  if (input.previewSelection.mappingStatus !== "matched") return "CSS/Sass Inspector requires a trusted Preview selection mapped to a DOM Snapshot node.";
  if (sources.length === 0) return undefined;
  return undefined;
}

function createStableId(prefix: string, ...parts: readonly string[]): string {
  return [prefix, ...parts.map((part) => part.trim().replace(/\s+/g, "-") || "none")].join(":");
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
