import type { ProjectDependency, ProjectPath, ProjectRoot } from "../graph/project-graph.types";

export type ProjectPreviewStatus = "idle" | "loading" | "ready" | "reloading" | "failed";

export type ProjectPreviewReloadReason = "manual" | "watch" | "project-open" | "page-change";

export type ProjectPreviewIssueSeverity = "info" | "warning" | "error";

export type ProjectPreviewIssueCode =
  | "no-project-root"
  | "no-project-graph"
  | "no-preview-target"
  | "target-not-in-graph"
  | "invalid-preview-path"
  | "path-traversal"
  | "outside-project-root"
  | "file-not-found"
  | "protocol-error"
  | "reload-skipped";

export interface ProjectPreviewIssue {
  readonly code: ProjectPreviewIssueCode;
  readonly severity: ProjectPreviewIssueSeverity;
  readonly message: string;
  readonly path: ProjectPath | null;
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
  readonly status: ProjectPreviewStatus;
  readonly lastLoadedAt: number | null;
  readonly lastReloadedAt: number | null;
  readonly lastReloadReason: ProjectPreviewReloadReason | null;
  readonly lastError: string | null;
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
