import type { ProjectDomSnapshotState } from "../../dom/project-dom-snapshot.types";
import type { ProjectPreviewSelectedNode } from "../project-preview-selection.types";
import type { ProjectPreviewSelectionMappingResult } from "./project-preview-selection-mapping.types";
import { findProjectDomNodeBySnapshotPath, findProjectDomNodeDiagnosticFallbackCandidates } from "./project-preview-selection-mapping-lookup";

export interface ProjectPreviewSelectionMappingInput {
  readonly selectedNode: ProjectPreviewSelectedNode;
  readonly domSnapshotState: ProjectDomSnapshotState;
  readonly previewTargetRelativePath: string | null;
  readonly checkedAt?: number;
}

export function mapProjectPreviewSelectionToDomSnapshot(input: ProjectPreviewSelectionMappingInput): ProjectPreviewSelectionMappingResult {
  const checkedAt = input.checkedAt ?? Date.now();
  const snapshot = input.domSnapshotState.currentDomSnapshot;

  if (!snapshot) return createMapping("missing-snapshot", null, "missing snapshot", checkedAt, null);
  if (input.domSnapshotState.status === "stale" || input.domSnapshotState.isStale) return createMapping("stale", null, "snapshot stale", checkedAt, snapshot.generatedAt);
  if (snapshot.status !== "ready") return createMapping("missing-snapshot", null, "missing snapshot", checkedAt, snapshot.generatedAt);
  if (input.previewTargetRelativePath && snapshot.rootRelativePath !== input.previewTargetRelativePath) return createMapping("stale", null, "snapshot stale", checkedAt, snapshot.generatedAt);

  const mappedNode = findProjectDomNodeBySnapshotPath(snapshot.rootNode, input.selectedNode.snapshotPath);
  if (!mappedNode) {
    const fallbackCandidates = findProjectDomNodeDiagnosticFallbackCandidates(snapshot.rootNode, input.selectedNode);
    if (fallbackCandidates.length > 1) return createMapping("ambiguous", null, "ambiguous fallback", checkedAt, snapshot.generatedAt);
    return createMapping("mismatched", null, "path not found", checkedAt, snapshot.generatedAt);
  }

  if (mappedNode.type !== "element") return createMapping("mismatched", mappedNode.snapshotPath, "tag mismatch", checkedAt, snapshot.generatedAt);

  const selectedTagName = input.selectedNode.tagName.toLowerCase();
  const mappedTagName = (mappedNode.tagName ?? "").toLowerCase();
  if (mappedTagName !== selectedTagName) return createMapping("mismatched", mappedNode.snapshotPath, "tag mismatch", checkedAt, snapshot.generatedAt);

  return createMapping("matched", mappedNode.snapshotPath, "path and tag match", checkedAt, snapshot.generatedAt);
}

function createMapping(mappingStatus: ProjectPreviewSelectionMappingResult["mappingStatus"], mappedSnapshotPath: string | null, mappingReason: string, mappingCheckedAt: number, snapshotGeneratedAt: number | null): ProjectPreviewSelectionMappingResult {
  return { mappingStatus, mappedSnapshotPath, mappingReason, mappingCheckedAt, snapshotGeneratedAt };
}
