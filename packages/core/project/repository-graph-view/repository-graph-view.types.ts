import type { ProjectDependencyStatus, ProjectDependencyType, ProjectFileKind } from "../graph/project-graph.types";

export const REPOSITORY_GRAPH_NODE_WIDTH = 244;
export const REPOSITORY_GRAPH_NODE_HEIGHT = 116;

export interface RepositoryGraphViewNode {
  readonly id: string;
  readonly relativePath: string;
  readonly name: string;
  readonly extension: string;
  readonly directoryPath: string;
  readonly kind: ProjectFileKind;
  readonly sizeBytes: number;
  readonly modifiedAtMs: number;
  readonly incomingCount: number;
  readonly outgoingCount: number;
  readonly unresolvedCount: number;
  readonly externalCount: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RepositoryGraphViewEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly dependencyType: ProjectDependencyType;
  readonly status: ProjectDependencyStatus;
  readonly directed: true;
}

export interface RepositoryGraphViewBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RepositoryGraphViewModel {
  readonly nodes: readonly RepositoryGraphViewNode[];
  readonly edges: readonly RepositoryGraphViewEdge[];
  readonly bounds: RepositoryGraphViewBounds;
  readonly kinds: readonly ProjectFileKind[];
}

export type RepositoryGraphEdgeMode = "all" | "selected" | "hidden";

export interface RepositoryGraphViewFilters {
  readonly query: string;
  readonly kind: ProjectFileKind | "all";
  readonly hideIsolated: boolean;
  readonly edgeMode: RepositoryGraphEdgeMode;
  readonly selectedNodeId: string | null;
}

export interface FilteredRepositoryGraphView {
  readonly nodes: readonly RepositoryGraphViewNode[];
  readonly edges: readonly RepositoryGraphViewEdge[];
}

export interface RepositoryGraphViewport {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;
}

export interface RepositoryGraphViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface RepositoryGraphPoint {
  readonly x: number;
  readonly y: number;
}
