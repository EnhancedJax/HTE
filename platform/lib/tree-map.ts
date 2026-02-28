import {
  type TreeNodeData,
  TREE_NODE_SOURCE_HANDLE_ID,
  TREE_NODE_TARGET_HANDLE_ID,
} from "@/lib/graph-types";
import type { TreeDataResponse } from "@/lib/schemas/tree";
import type { Edge, Node } from "@xyflow/react";

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
