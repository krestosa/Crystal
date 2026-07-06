import type { ProjectDomNode, ProjectDomSnapshotState } from "../dom/project-dom-snapshot.types";
import type { ProjectPreviewSelectionState } from "../preview-selection/project-preview-selection.types";
import type { ProjectPreviewState } from "../preview/project-preview.types";
import type { ProjectPreviewInspectorSelectedNodeDetails, ProjectPreviewInspectorSnapshotNodeDetails, ProjectPreviewInspectorStatus, ProjectPreviewInspectorViewModel } from "./project-preview-inspector.types";

export interface ProjectPreviewInspectorInput {
  readonly previewSelection: ProjectPreviewSelectionState;
  readonly domSnapshot: ProjectDomSnapshotState;
  readonly preview: ProjectPreviewState;
}

export function selectProjectPreviewInspectorViewModel(input: ProjectPreviewInspectorInput): ProjectPreviewInspectorViewModel {
  const selectedNode = input.previewSelection.selectedNode;
  if (!selectedNode) {
    return createViewModel("idle", "No Preview selection.", null, null);
  }

  const selectedDetails: ProjectPreviewInspectorSelectedNodeDetails = {
    tagName: selectedNode.tagName,
    snapshotPath: selectedNode.snapshotPath,
    mappedSnapshotPath: input.previewSelection.mappedSnapshotPath,
    mappingStatus: input.previewSelection.mappingStatus,
    mappingReason: input.previewSelection.mappingReason,
    selectorPreview: selectedNode.selectorPreview,
    textPreview: selectedNode.textPreview,
    attributesPreview: selectedNode.attributesPreview
  };

  const snapshot = input.domSnapshot.currentDomSnapshot;
  if (snapshot && input.preview.target && snapshot.rootRelativePath !== input.preview.target.relativePath) {
    return createViewModel("stale", "DOM Snapshot target does not match the current Preview target.", selectedDetails, null);
  }

  if (input.previewSelection.mappingStatus === "missing-snapshot") {
    return createViewModel("missing-snapshot", "Build DOM Snapshot required.", selectedDetails, null);
  }

  if (input.previewSelection.mappingStatus === "stale" || input.domSnapshot.isStale || input.domSnapshot.status === "stale") {
    return createViewModel("stale", "Rebuild DOM Snapshot recommended.", selectedDetails, null);
  }

  if (input.previewSelection.mappingStatus === "mismatched") {
    return createViewModel("mismatched", input.previewSelection.mappingReason ?? "Selection does not match the current DOM Snapshot.", selectedDetails, null);
  }

  if (input.previewSelection.mappingStatus === "ambiguous") {
    return createViewModel("ambiguous", input.previewSelection.mappingReason ?? "Selection has ambiguous DOM Snapshot candidates.", selectedDetails, null);
  }

  if (input.previewSelection.mappingStatus !== "matched") {
    return createViewModel("selected", "Selection is available, but no trusted DOM Snapshot match is available.", selectedDetails, null);
  }

  const mappedPath = input.previewSelection.mappedSnapshotPath;
  const snapshotRoot = snapshot?.rootNode ?? null;
  if (!mappedPath || !snapshotRoot) {
    return createViewModel("defensive", "Matched selection has no available DOM Snapshot node.", selectedDetails, null);
  }

  const snapshotNode = findProjectPreviewInspectorSnapshotNode(snapshotRoot, mappedPath);
  if (!snapshotNode) {
    return createViewModel("defensive", "Matched selection path was not found in the current DOM Snapshot.", selectedDetails, null);
  }

  return createViewModel("mapped", "Mapped DOM Snapshot node resolved.", selectedDetails, createSnapshotNodeDetails(snapshotNode));
}

export function findProjectPreviewInspectorSnapshotNode(rootNode: ProjectDomNode, snapshotPath: string): ProjectDomNode | null {
  if (rootNode.snapshotPath === snapshotPath) return rootNode;
  for (const child of rootNode.children) {
    const match = findProjectPreviewInspectorSnapshotNode(child, snapshotPath);
    if (match) return match;
  }
  return null;
}

function createSnapshotNodeDetails(node: ProjectDomNode): ProjectPreviewInspectorSnapshotNodeDetails {
  return {
    type: node.type,
    tagName: node.tagName,
    snapshotPath: node.snapshotPath,
    depth: node.depth,
    siblingIndex: node.siblingIndex,
    childCount: node.childCount,
    textPreview: node.textPreview,
    attributes: node.attributes,
    sourceLocation: node.sourceLocation ?? null,
    truncated: node.truncated
  };
}

function createViewModel(status: ProjectPreviewInspectorStatus, message: string, selectedNode: ProjectPreviewInspectorSelectedNodeDetails | null, snapshotNode: ProjectPreviewInspectorSnapshotNodeDetails | null): ProjectPreviewInspectorViewModel {
  return { status, message, selectedNode, snapshotNode };
}
