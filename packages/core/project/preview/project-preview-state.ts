import type { ProjectPreviewIssue, ProjectPreviewState } from "./project-preview.types";

export const initialProjectPreviewState: ProjectPreviewState = {
  rootPath: null,
  target: null,
  previewUrl: null,
  status: "idle",
  lastLoadedAt: null,
  lastReloadedAt: null,
  lastReloadReason: null,
  lastError: null,
  isSyncedWithProjectGraph: false,
  issues: []
};

export function createProjectPreviewIssue(issue: ProjectPreviewIssue): ProjectPreviewIssue {
  return issue;
}
