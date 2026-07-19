import type { ProjectDependency, ProjectGraph } from "../graph/project-graph.types";
import { layoutRepositoryGraphNodes } from "./repository-graph-view.layout";
import { REPOSITORY_GRAPH_NODE_HEIGHT, REPOSITORY_GRAPH_NODE_WIDTH, type RepositoryGraphViewEdge, type RepositoryGraphViewModel, type RepositoryGraphViewNode } from "./repository-graph-view.types";

interface MutableNodeCounts {
  incomingCount: number;
  outgoingCount: number;
  unresolvedCount: number;
  externalCount: number;
}

export function createRepositoryGraphViewModel(projectGraph: ProjectGraph): RepositoryGraphViewModel {
  const sortedFiles = [...projectGraph.files].sort((a, b) => compareStrings(a.relativePath, b.relativePath));
  const nodeIdsByPath = new Map(sortedFiles.map((file) => [file.relativePath, createRepositoryGraphNodeId(file.relativePath)]));
  const counts = new Map<string, MutableNodeCounts>();

  for (const nodeId of nodeIdsByPath.values()) counts.set(nodeId, createEmptyCounts());

  const edges = createEdges(projectGraph.dependencies, nodeIdsByPath, counts);
  const unpositionedNodes: RepositoryGraphViewNode[] = sortedFiles.map((file) => {
    const id = nodeIdsByPath.get(file.relativePath) as string;
    const nodeCounts = counts.get(id) ?? createEmptyCounts();
    return {
      id,
      relativePath: file.relativePath,
      name: file.name,
      extension: file.extension,
      directoryPath: getDirectoryPath(file.relativePath),
      kind: file.kind,
      sizeBytes: file.sizeBytes,
      modifiedAtMs: file.modifiedAtMs,
      ...nodeCounts,
      x: 0,
      y: 0,
      width: REPOSITORY_GRAPH_NODE_WIDTH,
      height: REPOSITORY_GRAPH_NODE_HEIGHT
    };
  });

  const layout = layoutRepositoryGraphNodes(unpositionedNodes);
  const kinds = [...new Set(layout.nodes.map((node) => node.kind))].sort(compareStrings);
  return { nodes: layout.nodes, edges, bounds: layout.bounds, kinds };
}

export function createRepositoryGraphNodeId(relativePath: string): string {
  return `file:${relativePath}`;
}

function createEdges(dependencies: readonly ProjectDependency[], nodeIdsByPath: ReadonlyMap<string, string>, counts: Map<string, MutableNodeCounts>): RepositoryGraphViewEdge[] {
  const sortedDependencies = [...dependencies].sort((a, b) => compareStrings(createDependencySortKey(a), createDependencySortKey(b)));
  const occurrenceByKey = new Map<string, number>();
  const edges: RepositoryGraphViewEdge[] = [];

  for (const dependency of sortedDependencies) {
    const fromNodeId = nodeIdsByPath.get(dependency.fromPath);
    if (!fromNodeId) continue;
    const fromCounts = counts.get(fromNodeId);
    if (!fromCounts) continue;

    if (dependency.isExternal || dependency.status === "external") {
      fromCounts.externalCount += 1;
      continue;
    }

    const toNodeId = dependency.resolvedPath ? nodeIdsByPath.get(dependency.resolvedPath) : undefined;
    if (dependency.status !== "resolved" || !toNodeId) {
      fromCounts.unresolvedCount += 1;
      continue;
    }

    const edgeKey = `${fromNodeId}->${toNodeId}:${dependency.type}:${dependency.normalizedSpecifier}:${dependency.line ?? 0}`;
    const occurrence = occurrenceByKey.get(edgeKey) ?? 0;
    occurrenceByKey.set(edgeKey, occurrence + 1);
    edges.push({
      id: `edge:${edgeKey}:${occurrence}`,
      fromNodeId,
      toNodeId,
      dependencyType: dependency.type,
      status: dependency.status,
      directed: true
    });
    fromCounts.outgoingCount += 1;
    const toCounts = counts.get(toNodeId);
    if (toCounts) toCounts.incomingCount += 1;
  }

  return edges.sort((a, b) => compareStrings(a.id, b.id));
}

function createDependencySortKey(dependency: ProjectDependency): string {
  return [dependency.fromPath, dependency.resolvedPath ?? "", dependency.type, dependency.normalizedSpecifier, dependency.rawSpecifier, String(dependency.line ?? 0), dependency.status, dependency.id].join("\u0000");
}

function createEmptyCounts(): MutableNodeCounts {
  return { incomingCount: 0, outgoingCount: 0, unresolvedCount: 0, externalCount: 0 };
}

function getDirectoryPath(relativePath: string): string {
  const separatorIndex = relativePath.lastIndexOf("/");
  return separatorIndex === -1 ? "." : relativePath.slice(0, separatorIndex);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
