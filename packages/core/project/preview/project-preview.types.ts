import type { ProjectDependency, ProjectPath, ProjectRoot } from "../graph/project-graph.types";

export type ProjectPreviewLoadId = string;

export type ProjectPreviewStatus = "idle" | "loading" | "ready" | "reloading" | "failed";

export type ProjectPreviewReloadReason = "manual" | "watch" | "project-open" | "page-change";

export type ProjectPreviewIssueSeverity = "info" | "warning" | "error";

export type ProjectPreviewResourceIssueType =
  | "file-not-found"
  | "outside-root"
  | "path-traversal"
  | "invalid-target"
  | "unsupported-mime"
  | "protocol-error"
  | "unknown";

export type ProjectPreviewIssueSource = "protocol" | "load" | "reload" | "target";

export type ProjectPreviewIssueCode =
  | "no-project-root"
  | "no-project-graph"
  | "no-preview-target"
  | "target-not-in-graph"
  | "invalid-preview-path"
  | "path-traversal"
  | "outside-project-root"
  | "file-not-found"
  | "unsupported-mime"
  | "protocol-error"
  | "reload-skipped"
  | "unknown";

export interface ProjectPreviewResourceIssue {
  readonly code: ProjectPreviewIssueCode;
  readonly type: ProjectPreviewResourceIssueType;
  readonly severity: ProjectPreviewIssueSeverity;
  readonly message: string;
  readonly path: ProjectPath | null;
  readonly relativePath: ProjectPath | null;
  readonly requestUrl: string | null;
  readonly loadId: ProjectPreviewLoadId | null;
  readonly reason: string;
  readonly source: ProjectPreviewIssueSource;
  readonly timestamp: number;
  readonly lastSeenAt: number;
  readonly count: number;
}

export type ProjectPreviewIssue = ProjectPreviewResourceIssue;

export interface ProjectPreviewResourceRequestResult {
  readonly ok: boolean;
  readonly status: number;
  readonly mimeType: string | null;
  readonly issue: ProjectPreviewIssue | null;
}

export interface ProjectPreviewTarget {
  readonly rootPath: ProjectRoot;
  readonly absolutePath: ProjectPath;
  readonly relativePath: ProjectPath;
  readonly displayName: string;
  readonly isEntrypoint: boolean;
  readonly dependencies: readonly ProjectDependency[];
  readonly directDependencyRelativePaths: readonly ProjectPath[];
}

export interface ProjectPreviewState {
  readonly rootPath: ProjectRoot | null;
  readonly target: ProjectPreviewTarget | null;
  readonly previewUrl: string | null;
  readonly activeLoadId: ProjectPreviewLoadId | null;
  readonly status: ProjectPreviewStatus;
  readonly lastLoadedAt: number | null;
  readonly lastReloadedAt: number | null;
  readonly lastReloadReason: ProjectPreviewReloadReason | null;
  readonly lastError: string | null;
  readonly lastIssueAt: number | null;
  readonly issueCount: number;
  readonly isSyncedWithProjectGraph: boolean;
  readonly issues: readonly ProjectPreviewIssue[];
}

export interface ProjectPreviewLoadResult {
  readonly ok: boolean;
  readonly state: ProjectPreviewState;
  readonly issue: ProjectPreviewIssue | null;
}

export interface ProjectPreviewSetTargetRequest {
  readonly relativePath: ProjectPath;
}

export interface ProjectPreviewPathResolution {
  readonly ok: boolean;
  readonly rootPath: ProjectRoot;
  readonly relativePath: ProjectPath | null;
  readonly absolutePath: ProjectPath | null;
  readonly issue: ProjectPreviewIssue | null;
}
