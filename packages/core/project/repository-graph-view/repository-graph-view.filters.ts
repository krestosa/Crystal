import type { FilteredRepositoryGraphView, RepositoryGraphViewFilters, RepositoryGraphViewModel } from "./repository-graph-view.types";

export function filterRepositoryGraphView(model: RepositoryGraphViewModel, filters: RepositoryGraphViewFilters): FilteredRepositoryGraphView {
  const query = filters.query.trim().toLocaleLowerCase();
  const nodes = model.nodes.filter((node) => {
    if (filters.kind !== "all" && node.kind !== filters.kind) return false;
    if (filters.hideIsolated && node.incomingCount + node.outgoingCount === 0) return false;
    if (query && !node.name.toLocaleLowerCase().includes(query) && !node.relativePath.toLocaleLowerCase().includes(query)) return false;
    return true;
  });

  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = filters.edgeMode === "hidden" ? [] : model.edges.filter((edge) => {
    if (!visibleNodeIds.has(edge.fromNodeId) || !visibleNodeIds.has(edge.toNodeId)) return false;
    if (filters.edgeMode === "selected") return filters.selectedNodeId !== null && (edge.fromNodeId === filters.selectedNodeId || edge.toNodeId === filters.selectedNodeId);
    return true;
  });

  return { nodes, edges };
}
