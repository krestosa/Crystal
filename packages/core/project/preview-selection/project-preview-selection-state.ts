import type { ProjectPreviewSelectionState } from "./project-preview-selection.types";

export const initialProjectPreviewSelectionState: ProjectPreviewSelectionState = {
  enabled: false,
  mode: "idle",
  selectedNode: null,
  lastSelectedAt: null,
  lastIssue: null,
  mappingStatus: "unknown",
  mappedSnapshotPath: null,
  mappingReason: null,
  mappingCheckedAt: null,
  snapshotGeneratedAt: null
};
