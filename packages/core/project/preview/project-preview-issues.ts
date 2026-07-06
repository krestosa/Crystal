import type { ProjectPreviewIssue, ProjectPreviewIssueCode, ProjectPreviewIssueSeverity, ProjectPreviewIssueSource, ProjectPreviewLoadId, ProjectPreviewResourceIssueType } from "./project-preview.types";

export const maxProjectPreviewIssues = 50;

export interface CreateProjectPreviewIssueInput {
  readonly code: ProjectPreviewIssueCode;
  readonly severity?: ProjectPreviewIssueSeverity;
  readonly message: string;
  readonly path?: string | null;
  readonly relativePath?: string | null;
  readonly requestUrl?: string | null;
  readonly loadId?: ProjectPreviewLoadId | null;
  readonly reason?: string;
  readonly source: ProjectPreviewIssueSource;
  readonly timestamp?: number;
}

export function createProjectPreviewIssue(input: CreateProjectPreviewIssueInput): ProjectPreviewIssue {
  const timestamp = input.timestamp ?? Date.now();
  const relativePath = input.relativePath ?? input.path ?? null;
  return { code: input.code, type: toProjectPreviewResourceIssueType(input.code), severity: input.severity ?? defaultSeverityForIssue(input.code), message: input.message, path: relativePath, relativePath, requestUrl: input.requestUrl ?? null, loadId: input.loadId ?? null, reason: input.reason ?? input.message, source: input.source, timestamp, lastSeenAt: timestamp, count: 1 };
}

export function mergeProjectPreviewIssue(issues: readonly ProjectPreviewIssue[], incoming: ProjectPreviewIssue, maxIssues: number = maxProjectPreviewIssues): readonly ProjectPreviewIssue[] {
  const incomingKey = getProjectPreviewIssueKey(incoming);
  const existingIndex = issues.findIndex((issue) => getProjectPreviewIssueKey(issue) === incomingKey);
  if (existingIndex >= 0) {
    const existing = issues[existingIndex];
    const merged: ProjectPreviewIssue = { ...existing, severity: mergeSeverity(existing.severity, incoming.severity), message: incoming.message, requestUrl: incoming.requestUrl ?? existing.requestUrl, loadId: incoming.loadId ?? existing.loadId, lastSeenAt: incoming.lastSeenAt, count: existing.count + 1 };
    return [merged, ...issues.slice(0, existingIndex), ...issues.slice(existingIndex + 1)].slice(0, maxIssues);
  }
  return [incoming, ...issues].slice(0, maxIssues);
}

export function getProjectPreviewIssueCount(issues: readonly ProjectPreviewIssue[]): number {
  return issues.reduce((total, issue) => total + issue.count, 0);
}

export function getLastProjectPreviewIssueTimestamp(issues: readonly ProjectPreviewIssue[]): number | null {
  return issues.reduce<number | null>((latest, issue) => latest === null ? issue.lastSeenAt : Math.max(latest, issue.lastSeenAt), null);
}

export function toProjectPreviewResourceIssueType(code: ProjectPreviewIssueCode): ProjectPreviewResourceIssueType {
  if (code === "file-not-found") return "file-not-found";
  if (code === "outside-project-root") return "outside-root";
  if (code === "path-traversal") return "path-traversal";
  if (code === "invalid-preview-path" || code === "target-not-in-graph" || code === "no-preview-target" || code === "no-project-graph") return "invalid-target";
  if (code === "unsupported-mime") return "unsupported-mime";
  if (code === "protocol-error" || code === "no-project-root" || code === "reload-skipped") return "protocol-error";
  return "unknown";
}

function defaultSeverityForIssue(code: ProjectPreviewIssueCode): ProjectPreviewIssueSeverity {
  if (code === "unsupported-mime") return "warning";
  if (code === "reload-skipped") return "info";
  return "error";
}

function getProjectPreviewIssueKey(issue: ProjectPreviewIssue): string {
  return [issue.loadId ?? "no-load", issue.type, issue.relativePath ?? issue.path ?? issue.requestUrl ?? "preview", issue.reason].join("|");
}

function mergeSeverity(current: ProjectPreviewIssueSeverity, incoming: ProjectPreviewIssueSeverity): ProjectPreviewIssueSeverity {
  if (current === "error" || incoming === "error") return "error";
  if (current === "warning" || incoming === "warning") return "warning";
  return "info";
}
