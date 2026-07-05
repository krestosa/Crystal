import type { ProjectPath } from "../graph/project-graph.types";

export type ProjectDomNodeType = "document" | "element" | "text" | "comment" | "doctype";
export type ProjectDomSnapshotStatus = "idle" | "building" | "ready" | "failed" | "stale";
export type ProjectDomSnapshotSource = "html-source";
export type ProjectDomSnapshotIssueSeverity = "info" | "warning" | "error";

export type ProjectDomSnapshotIssueCode =
  | "no-preview-target"
  | "invalid-dom-target"
  | "file-not-found"
  | "read-failed"
  | "parse-warning"
  | "malformed-tag"
  | "unclosed-tag"
  | "unsupported-html-pattern"
  | "text-truncated"
  | "attributes-truncated"
  | "node-limit-exceeded"
  | "depth-limit-exceeded"
  | "max-nodes-reached"
  | "max-depth-reached"
  | "path-traversal"
  | "outside-project-root"
  | "unknown";

export interface ProjectDomAttribute {
  readonly name: string;
  readonly value: string | null;
  readonly truncated: boolean;
}

export interface ProjectDomSourceLocation {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface ProjectDomNode {
  readonly id: string;
  readonly snapshotPath: string;
  readonly siblingIndex: number;
  readonly type: ProjectDomNodeType;
  readonly tagName: string | null;
  readonly textPreview: string | null;
  readonly attributes: readonly ProjectDomAttribute[];
  readonly children: readonly ProjectDomNode[];
  readonly depth: number;
  readonly childCount: number;
  readonly sourceLocation?: ProjectDomSourceLocation;
  readonly truncated: boolean;
}

export interface ProjectDomSnapshotIssue {
  readonly code: ProjectDomSnapshotIssueCode;
  readonly severity: ProjectDomSnapshotIssueSeverity;
  readonly message: string;
  readonly relativePath: ProjectPath | null;
  readonly reason: string;
  readonly timestamp: number;
}

export interface ProjectDomSnapshot {
  readonly id: string;
  readonly rootRelativePath: ProjectPath;
  readonly generatedAt: number;
  readonly source: ProjectDomSnapshotSource;
  readonly status: "ready" | "failed";
  readonly rootNode: ProjectDomNode;
  readonly nodeCount: number;
  readonly maxDepth: number;
  readonly isTruncated: boolean;
  readonly issues: readonly ProjectDomSnapshotIssue[];
}

export interface ProjectDomSnapshotState {
  readonly status: ProjectDomSnapshotStatus;
  readonly currentDomSnapshot: ProjectDomSnapshot | null;
  readonly lastDomSnapshotAt: number | null;
  readonly lastClearedAt: number | null;
  readonly lastError: string | null;
  readonly domSnapshotIssueCount: number;
  readonly issues: readonly ProjectDomSnapshotIssue[];
  readonly isStale: boolean;
}

export interface ProjectDomSnapshotBuildResult {
  readonly ok: boolean;
  readonly state: ProjectDomSnapshotState;
  readonly snapshot: ProjectDomSnapshot | null;
  readonly issues: readonly ProjectDomSnapshotIssue[];
}
