import { findDomSnapshotNodeByPath, HTML_ELEMENT_VOID_TAG_NAMES } from "../project/html-element-library";
import type { ProjectDomNode } from "../project/dom/project-dom-snapshot.types";
import type { HtmlElementInsertionMode } from "../project/html-element-library";
import type { CreateHtmlSourceInsertionAnchorInput, HtmlSourceInsertionAnchor } from "./html-source-anchor.types";
import { toHtmlSourceInsertionAnchorSourceLocation } from "./html-source-anchor.types";
import { validateHtmlSourceInsertionAnchor } from "./html-source-anchor.validators";

export function createHtmlSourceInsertionAnchor(input: CreateHtmlSourceInsertionAnchorInput): HtmlSourceInsertionAnchor {
  const blocked = createBlockedAnchor(input, input.targetEligibility.reason);
  if (!input.selectedItem) return createBlockedAnchor(input, "Select an Element Library item before planning insertion.");
  if (input.targetEligibility.state !== "matched-target") return blocked;
  if (!isModeAllowedByEligibility(input.insertionMode, input.targetEligibility)) {
    return createBlockedAnchor(input, `Insertion mode ${input.insertionMode} is not eligible for the current target.`, "unsupported-mode");
  }

  const snapshot = input.domSnapshotState?.currentDomSnapshot;
  if (!snapshot) return createBlockedAnchor(input, "Current DOM Snapshot is unavailable.", "missing-source-location");

  const targetSnapshotPath = input.targetEligibility.targetSnapshotPath ?? "";
  const targetNode = findDomSnapshotNodeByPath(snapshot.rootNode, targetSnapshotPath);
  if (!targetNode || targetNode.type !== "element" || !targetNode.tagName) {
    return createBlockedAnchor(input, "Matched target node is unavailable in the current DOM Snapshot.");
  }

  const normalizedTargetTagName = targetNode.tagName.toLowerCase();
  if (input.insertionMode === "inside" && HTML_ELEMENT_VOID_TAG_NAMES.has(normalizedTargetTagName)) {
    return createBlockedAnchor(input, `Cannot insert inside void element <${normalizedTargetTagName}>.`, "unsupported-mode", targetNode);
  }

  if (input.insertionMode === "after" || input.insertionMode === "inside") {
    return createBlockedAnchor(input, `${input.insertionMode} insertion requires an end-tag source location that is not tracked yet.`, "unsupported-mode", targetNode);
  }

  if (!targetNode.sourceLocation) {
    return createBlockedAnchor(input, "Target DOM Snapshot node has no sourceLocation.", "missing-source-location", targetNode);
  }

  const anchor: HtmlSourceInsertionAnchor = {
    targetFilePath: input.targetEligibility.targetFilePath ?? "",
    targetSnapshotPath: targetNode.snapshotPath,
    targetTagName: normalizedTargetTagName,
    insertionMode: input.insertionMode,
    sourceLocation: toHtmlSourceInsertionAnchorSourceLocation(targetNode.sourceLocation),
    confidence: "exact",
    status: "ready",
    reason: `Insert ${input.insertionMode} <${normalizedTargetTagName}> using DOM Snapshot sourceLocation.`
  };

  return validateHtmlSourceInsertionAnchor(anchor).normalizedAnchor ?? anchor;
}

function createBlockedAnchor(
  input: CreateHtmlSourceInsertionAnchorInput,
  reason: string,
  status: HtmlSourceInsertionAnchor["status"] = "unsupported-target",
  targetNode?: ProjectDomNode
): HtmlSourceInsertionAnchor {
  const targetTagName = targetNode?.tagName?.toLowerCase() ?? input.targetEligibility.targetTagName ?? "";
  const targetSnapshotPath = targetNode?.snapshotPath ?? input.targetEligibility.targetSnapshotPath ?? "";
  return {
    targetFilePath: input.targetEligibility.targetFilePath ?? "",
    targetSnapshotPath,
    targetTagName,
    insertionMode: input.insertionMode,
    sourceLocation: targetNode?.sourceLocation ? toHtmlSourceInsertionAnchorSourceLocation(targetNode.sourceLocation) : null,
    confidence: "unavailable",
    status,
    reason
  };
}

function isModeAllowedByEligibility(mode: HtmlElementInsertionMode, eligibility: CreateHtmlSourceInsertionAnchorInput["targetEligibility"]): boolean {
  if (mode === "before") return eligibility.canInsertBefore;
  if (mode === "after") return eligibility.canInsertAfter;
  return eligibility.canInsertInside;
}
