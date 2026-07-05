import type { ProjectPreviewState } from "./project-preview.types";

export const initialProjectPreviewState: ProjectPreviewState = {
  rootPath: null,
  target: null,
  previewUrl: null,
  status: "idle",
  lastLoadedAt: null,
  lastReloadedAt: null,
  lastReloadReason: null,
  lastError: null,
  lastIssueAt: null,
  issueCount: 0,
  isSyncedWithProjectGraph: false,
  issues: []
};

export { createProjectPreviewIssue } from "./project-preview-issues";
