import type { ProjectGraph } from "../../../../../../packages/core/project/graph/project-graph.types";
import { createRepositoryGraphViewModel, createRepositoryGraphViewport, type RepositoryGraphViewNode } from "../../../../../../packages/core/project/repository-graph-view";
import type { RepositoryGraphViewState } from "./repository-graph-view.types";

export function createRepositoryGraphViewState(): RepositoryGraphViewState {
  return {
    model: null,
    positions: new Map(),
    query: "",
    kind: "all",
    hideIsolated: false,
    edgeMode: "all",
    selectedNodeId: null,
    viewport: createRepositoryGraphViewport()
  };
}

export function setRepositoryGraphProject(state: RepositoryGraphViewState, graph: ProjectGraph | null): void {
  state.model = graph ? createRepositoryGraphViewModel(graph) : null;
  state.positions.clear();
  state.selectedNodeId = null;
  state.viewport = createRepositoryGraphViewport();
}

export function moveRepositoryGraphNode(state: RepositoryGraphViewState, nodeId: string, deltaX: number, deltaY: number): void {
  const node = state.model?.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return;
  const current = state.positions.get(nodeId) ?? { x: node.x, y: node.y };
  state.positions.set(nodeId, { x: current.x + deltaX, y: current.y + deltaY });
}

export function getRepositoryGraphNode(state: RepositoryGraphViewState, nodeId: string | null): RepositoryGraphViewNode | null {
  if (!nodeId) return null;
  const node = state.model?.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  const position = state.positions.get(node.id);
  return position ? { ...node, x: position.x, y: position.y } : node;
}
