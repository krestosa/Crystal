import type { ProjectFileKind } from "../../../../../../packages/core/project/graph/project-graph.types";
import type { RepositoryGraphEdgeMode, RepositoryGraphViewModel, RepositoryGraphViewNode, RepositoryGraphViewport } from "../../../../../../packages/core/project/repository-graph-view";

export interface RepositoryGraphViewElements {
  readonly root: HTMLElement;
  readonly surface: HTMLElement;
  readonly stage: HTMLElement;
  readonly edgeLayer: SVGSVGElement;
  readonly nodeLayer: HTMLElement;
  readonly status: HTMLElement;
  readonly summary: HTMLElement;
  readonly searchInput: HTMLInputElement;
  readonly kindSelect: HTMLSelectElement;
  readonly hideIsolatedInput: HTMLInputElement;
  readonly edgeModeSelect: HTMLSelectElement;
  readonly fitButton: HTMLButtonElement;
  readonly resetButton: HTMLButtonElement;
  readonly centerButton: HTMLButtonElement;
  readonly zoomDisplay: HTMLElement;
  readonly detailPanel: HTMLElement;
}

export interface RepositoryGraphNodePosition {
  x: number;
  y: number;
}

export interface RepositoryGraphViewState {
  model: RepositoryGraphViewModel | null;
  readonly positions: Map<string, RepositoryGraphNodePosition>;
  query: string;
  kind: ProjectFileKind | "all";
  hideIsolated: boolean;
  edgeMode: RepositoryGraphEdgeMode;
  selectedNodeId: string | null;
  viewport: RepositoryGraphViewport;
}

export interface RepositoryGraphPanSession {
  readonly pointerId: number;
  readonly lastClientX: number;
  readonly lastClientY: number;
}

export interface RepositoryGraphNodeDragSession {
  readonly pointerId: number;
  readonly nodeId: string;
  readonly lastClientX: number;
  readonly lastClientY: number;
  moved: boolean;
}

export function resolveRepositoryGraphNode(state: RepositoryGraphViewState, node: RepositoryGraphViewNode): RepositoryGraphViewNode {
  const position = state.positions.get(node.id);
  return position ? { ...node, x: position.x, y: position.y } : node;
}
