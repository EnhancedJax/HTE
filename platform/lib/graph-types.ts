import type { TreeNodeDataPayload } from "@/lib/schemas/tree";

/**
 * UI layer: node data as used by React Flow.
 * Aligned with API payload so server and client share the same shape.
 */
export type TreeLevel = TreeNodeDataPayload["level"];
export type TreeNodeData = TreeNodeDataPayload & Record<string, unknown>;

/** Handle id for center-to-center tree edges; must match edge sourceHandle/targetHandle. */
export const TREE_NODE_CENTER_HANDLE_ID = "center";
