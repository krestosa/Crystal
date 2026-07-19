import { REPOSITORY_GRAPH_NODE_HEIGHT, REPOSITORY_GRAPH_NODE_WIDTH, type RepositoryGraphViewBounds, type RepositoryGraphViewNode } from "./repository-graph-view.types";

const ROOT_GROUP = "";
const GROUP_COLUMN_WIDTH = 292;
const GROUP_START_X = 32;
const GROUP_START_Y = 64;
const NODE_ROW_GAP = 34;
const BOUNDS_PADDING = 32;

export function layoutRepositoryGraphNodes(nodes: readonly RepositoryGraphViewNode[]): { readonly nodes: readonly RepositoryGraphViewNode[]; readonly bounds: RepositoryGraphViewBounds } {
  if (nodes.length === 0) return { nodes: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };

  const groups = new Map<string, RepositoryGraphViewNode[]>();
  for (const node of nodes) {
    const groupName = getFirstDirectory(node.relativePath);
    const group = groups.get(groupName) ?? [];
    group.push(node);
    groups.set(groupName, group);
  }

  const groupNames = [...groups.keys()].sort(compareGroups);
  const positioned: RepositoryGraphViewNode[] = [];
  let maxBottom = 0;

  groupNames.forEach((groupName, columnIndex) => {
    const groupNodes = [...(groups.get(groupName) ?? [])].sort((a, b) => compareStrings(a.relativePath, b.relativePath));
    const x = GROUP_START_X + columnIndex * GROUP_COLUMN_WIDTH;
    groupNodes.forEach((node, rowIndex) => {
      const y = GROUP_START_Y + rowIndex * (REPOSITORY_GRAPH_NODE_HEIGHT + NODE_ROW_GAP);
      maxBottom = Math.max(maxBottom, y + REPOSITORY_GRAPH_NODE_HEIGHT);
      positioned.push({ ...node, x, y, width: REPOSITORY_GRAPH_NODE_WIDTH, height: REPOSITORY_GRAPH_NODE_HEIGHT });
    });
  });

  const maxRight = GROUP_START_X + (groupNames.length - 1) * GROUP_COLUMN_WIDTH + REPOSITORY_GRAPH_NODE_WIDTH;
  return {
    nodes: positioned.sort((a, b) => compareStrings(a.relativePath, b.relativePath)),
    bounds: {
      x: 0,
      y: 0,
      width: maxRight + BOUNDS_PADDING,
      height: maxBottom + BOUNDS_PADDING
    }
  };
}

export function getFirstDirectory(relativePath: string): string {
  const separatorIndex = relativePath.indexOf("/");
  return separatorIndex === -1 ? ROOT_GROUP : relativePath.slice(0, separatorIndex);
}

function compareGroups(left: string, right: string): number {
  if (left === ROOT_GROUP) return right === ROOT_GROUP ? 0 : -1;
  if (right === ROOT_GROUP) return 1;
  return compareStrings(left, right);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
