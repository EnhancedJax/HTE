import type { Edge, Node } from "@xyflow/react";
import {
  type TreeNodeData,
  TREE_NODE_CENTER_HANDLE_ID,
} from "@/lib/graph-types";
import type { TreeDataResponse } from "@/lib/schemas/tree";

const PLACEHOLDER_POSITION = { x: 0, y: 0 };

/**
 * Maps API response to React Flow nodes (no positions; layout runs separately).
 */
export function payloadToFlowNodes(
  payloadNodes: TreeDataResponse["nodes"],
): Node<TreeNodeData>[] {
  return payloadNodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: PLACEHOLDER_POSITION,
    data: n.data as TreeNodeData,
  }));
}

/**
 * Maps API response to React Flow edges (with client-only edge type and handle ids).
 * sourceHandle/targetHandle must match TreeNode's TREE_NODE_CENTER_HANDLE_ID so React Flow can resolve edges.
 */
export function payloadToFlowEdges(
  payloadEdges: TreeDataResponse["edges"],
): Edge[] {
  return payloadEdges.map((e) => ({
    ...e,
    type: "centerToCenter",
    sourceHandle: TREE_NODE_CENTER_HANDLE_ID,
    targetHandle: TREE_NODE_CENTER_HANDLE_ID,
  }));
}
