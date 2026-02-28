import {
  type TreeNodeData,
  TREE_NODE_SOURCE_HANDLE_ID,
  TREE_NODE_TARGET_HANDLE_ID,
} from "@/lib/graph-types";
import type { TreeDataResponse } from "@/lib/schemas/tree";
import type { Edge, Node } from "@xyflow/react";

/**
 * Assigns branchIndex to level-2 and level-3 nodes so each second-level branch
 * gets a palette color; subnodes inherit that branch for styling.
 */
export function enrichNodesWithBranchColors(
  nodes: Node<TreeNodeData>[],
  edges: Edge[],
): Node<TreeNodeData>[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parentId = new Map<string, string>();
  for (const e of edges) {
    parentId.set(e.target, e.source);
  }

  const root = nodes.find((n) => (n.data?.level as number) === 1);
  if (!root) return nodes;

  const level2Children = nodes
    .filter((n) => (n.data?.level as number) === 2 && parentId.get(n.id) === root.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  const branchIndexByNodeId = new Map<string, number>();
  level2Children.forEach((n, i) => branchIndexByNodeId.set(n.id, i));

  function getBranchIndex(nodeId: string): number | undefined {
    if (branchIndexByNodeId.has(nodeId)) return branchIndexByNodeId.get(nodeId);
    const pid = parentId.get(nodeId);
    if (!pid) return undefined;
    return getBranchIndex(pid);
  }

  return nodes.map((node) => {
    const level = node.data?.level as number | undefined;
    const bi = level !== undefined && level >= 2 ? getBranchIndex(node.id) : undefined;
    if (bi === undefined) return node;
    return {
      ...node,
      data: { ...node.data, branchIndex: bi },
    };
  });
}

const PLACEHOLDER_POSITION = { x: 0, y: 0 };

/**
 * Maps API response to React Flow nodes (no positions; layout runs separately).
 * Node type is forced to "treeNode" so the custom node with Handle components is used;
 * edges then attach to handles instead of node center.
 */
export function payloadToFlowNodes(
  payloadNodes: TreeDataResponse["nodes"],
): Node<TreeNodeData>[] {
  return payloadNodes.map((n) => ({
    id: n.id,
    type: "treeNode",
    position: PLACEHOLDER_POSITION,
    data: n.data as TreeNodeData,
  }));
}

/**
 * Maps API response to React Flow edges.
 * sourceHandle/targetHandle match TreeNode handle ids so edges attach to left/right handles.
 */
export function payloadToFlowEdges(
  payloadEdges: TreeDataResponse["edges"],
): Edge[] {
  return payloadEdges.map((e) => ({
    ...e,
    type: "treeEdge",
    sourceHandle: TREE_NODE_SOURCE_HANDLE_ID,
    targetHandle: TREE_NODE_TARGET_HANDLE_ID,
  }));
}
