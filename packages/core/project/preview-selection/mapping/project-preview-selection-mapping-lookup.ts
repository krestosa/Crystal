import type { ProjectDomNode } from "../../dom/project-dom-snapshot.types";
import type { ProjectPreviewSelectedNode } from "../project-preview-selection.types";

export function findProjectDomNodeBySnapshotPath(rootNode: ProjectDomNode, snapshotPath: string): ProjectDomNode | null {
  if (rootNode.snapshotPath === snapshotPath) return rootNode;

  for (const child of rootNode.children) {
    const match = findProjectDomNodeBySnapshotPath(child, snapshotPath);
    if (match) return match;
  }

  return null;
}

export function findProjectDomNodeDiagnosticFallbackCandidates(rootNode: ProjectDomNode, selectedNode: ProjectPreviewSelectedNode): readonly ProjectDomNode[] {
  const candidates: ProjectDomNode[] = [];
  collectDiagnosticCandidates(rootNode, selectedNode, candidates);
  return candidates;
}

function collectDiagnosticCandidates(rootNode: ProjectDomNode, selectedNode: ProjectPreviewSelectedNode, candidates: ProjectDomNode[]): void {
  if (isDiagnosticCandidate(rootNode, selectedNode)) candidates.push(rootNode);
  for (const child of rootNode.children) collectDiagnosticCandidates(child, selectedNode, candidates);
}

function isDiagnosticCandidate(node: ProjectDomNode, selectedNode: ProjectPreviewSelectedNode): boolean {
  if (node.type !== "element") return false;
  if ((node.tagName ?? "").toLowerCase() !== selectedNode.tagName.toLowerCase()) return false;
  return hasMatchingDiagnosticAttributes(node, selectedNode);
}

function hasMatchingDiagnosticAttributes(node: ProjectDomNode, selectedNode: ProjectPreviewSelectedNode): boolean {
  const selectedId = selectedNode.attributesPreview.find((attribute) => attribute.name.toLowerCase() === "id" && attribute.value);
  if (selectedId) return node.attributes.some((attribute) => attribute.name.toLowerCase() === "id" && attribute.value === selectedId.value);

  const selectedClass = selectedNode.attributesPreview.find((attribute) => attribute.name.toLowerCase() === "class" && attribute.value);
  if (!selectedClass?.value) return true;

  const selectedClassNames = selectedClass.value.split(/\s+/).filter(Boolean);
  if (selectedClassNames.length === 0) return true;

  const nodeClass = node.attributes.find((attribute) => attribute.name.toLowerCase() === "class" && attribute.value);
  if (!nodeClass?.value) return false;

  const nodeClassNames = new Set(nodeClass.value.split(/\s+/).filter(Boolean));
  return selectedClassNames.every((className) => nodeClassNames.has(className));
}
