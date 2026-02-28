import type { Edge, Node } from "@xyflow/react";
import type { TreeNodeData } from "@/lib/graph-types";

export interface TreeItem {
  id: string;
  label: string;
  children?: TreeItem[];
}

/**
 * Builds a directory-like tree from React Flow nodes and edges.
 * Root is the level-1 node; children follow edges (source → target).
 */
export function nodesEdgesToTree(
  nodes: Node<TreeNodeData>[],
  edges: Edge[],
): TreeItem | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenBySource = new Map<string, string[]>();
  for (const e of edges) {
    const list = childrenBySource.get(e.source) ?? [];
    list.push(e.target);
    childrenBySource.set(e.source, list);
  }

  const root = nodes.find((n) => (n.data?.level as number) === 1);
  if (!root) return null;

  function buildItem(nodeId: string): TreeItem | undefined {
    const node = byId.get(nodeId);
    if (!node?.data?.label) return undefined;
    const childIds = childrenBySource.get(nodeId) ?? [];
    const children = childIds
      .map(buildItem)
      .filter((c): c is TreeItem => c != null)
      .sort((a, b) => a.label.localeCompare(b.label));
    return {
      id: node.id,
      label: node.data.label as string,
      ...(children.length > 0 ? { children } : {}),
    };
  }

  return buildItem(root.id) ?? null;
}
