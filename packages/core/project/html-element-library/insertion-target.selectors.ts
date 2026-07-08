import type { ProjectDomNode } from "../dom/project-dom-snapshot.types";
import { HTML_ELEMENT_VOID_TAG_NAMES } from "./html-element-library.constants";
import type { HtmlInsertionTargetEligibility, HtmlInsertionTargetEligibilityInput, HtmlInsertionTargetStateCode } from "./insertion-target.types";

export function selectHtmlInsertionTargetEligibility(input: HtmlInsertionTargetEligibilityInput): HtmlInsertionTargetEligibility {
  if (!input.projectGraph) return state("no-project", "No project", "Open a project before selecting an insertion target.");
  if (!input.preview?.target) return state("no-preview-target", "No preview target", "Load or select an HTML preview target.");
  if (!input.previewSelection?.selectedNode) return state("no-selection", "No selection", "Select a node in Preview selection mode.");
  if (!input.domSnapshot?.currentDomSnapshot) return state("missing-snapshot", "Missing snapshot", "Build a DOM Snapshot before insertion can be planned.");
  if (input.domSnapshot.isStale || input.domSnapshot.status === "stale" || input.previewSelection.mappingStatus === "stale") return state("stale-snapshot", "Stale snapshot", "Rebuild the DOM Snapshot before planning insertion.");
  if (input.previewSelection.mappingStatus === "missing-snapshot") return state("missing-snapshot", "Missing snapshot", "Selection mapping has no current DOM Snapshot.");
  if (input.previewSelection.mappingStatus === "ambiguous") return state("ambiguous-selection", "Ambiguous selection", input.previewSelection.mappingReason ?? "Multiple DOM Snapshot nodes could match the selection.");
  if (input.previewSelection.mappingStatus === "mismatched") return state("mismatched-selection", "Mismatched selection", input.previewSelection.mappingReason ?? "Preview selection does not match the current DOM Snapshot.");
  if (input.previewSelection.mappingStatus !== "matched" || !input.previewSelection.mappedSnapshotPath) return state("unsupported-target", "Unsupported target", "Selection mapping is not matched yet.");
  if (input.preview.target.relativePath !== input.domSnapshot.currentDomSnapshot.rootRelativePath) return state("mismatched-selection", "Mismatched selection", "Preview target and DOM Snapshot target differ.");

  const targetNode = findDomSnapshotNodeByPath(input.domSnapshot.currentDomSnapshot.rootNode, input.previewSelection.mappedSnapshotPath);
  if (!targetNode) return state("mismatched-selection", "Mismatched selection", "Mapped DOM Snapshot path was not found.");
  if (targetNode.type !== "element" || !targetNode.tagName) return state("unsupported-target", "Unsupported target", "Only element nodes can be future insertion targets.");

  const normalizedTagName = targetNode.tagName.toLowerCase();
  const canInsertInside = !HTML_ELEMENT_VOID_TAG_NAMES.has(normalizedTagName);
  return {
    state: "matched-target",
    label: "Matched target",
    reason: canInsertInside ? "Selection maps to a current DOM Snapshot element." : `${normalizedTagName} is a void element; inside insertion is unavailable.`,
    targetTagName: normalizedTagName,
    targetSnapshotPath: targetNode.snapshotPath,
    targetFilePath: input.preview.target.relativePath,
    canInsertBefore: true,
    canInsertAfter: true,
    canInsertInside
  };
}

export function findDomSnapshotNodeByPath(node: ProjectDomNode, snapshotPath: string): ProjectDomNode | null {
  if (node.snapshotPath === snapshotPath) return node;
  for (const child of node.children) {
    const match = findDomSnapshotNodeByPath(child, snapshotPath);
    if (match) return match;
  }
  return null;
}

function state(stateCode: Exclude<HtmlInsertionTargetStateCode, "matched-target">, label: string, reason: string): HtmlInsertionTargetEligibility {
  return {
    state: stateCode,
    label,
    reason,
    canInsertBefore: false,
    canInsertAfter: false,
    canInsertInside: false
  };
}
