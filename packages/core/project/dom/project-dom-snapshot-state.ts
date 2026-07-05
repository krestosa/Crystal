import type { ProjectDomSnapshotState } from "./project-dom-snapshot.types";

export const initialProjectDomSnapshotState: ProjectDomSnapshotState = {
  status: "idle",
  currentDomSnapshot: null,
  lastDomSnapshotAt: null,
  lastClearedAt: null,
  lastError: null,
  domSnapshotIssueCount: 0,
  issues: [],
  isStale: false
};
