import type { TreeNodeDataPayload } from "@/lib/schemas/tree";

/**
 * UI layer: node data as used by React Flow.
 * Aligned with API payload so server and client share the same shape.
 */
export type TreeLevel = TreeNodeDataPayload["level"];
export type TreeNodeData = TreeNodeDataPayload & Record<string, unknown>;

/** Colors for second-level branches; each L2 node gets one, L3 subnodes use it for fg + transparent bg. Loops by index % length. */
export const NODE_PALETTE = [
  "#FFF0B8",
  "#CCFFB8",
  "#DB90FF",
  "#8ABEFF",
] as const;

/** Handle id for the source (outgoing) connection; must match edge sourceHandle. */
export const TREE_NODE_SOURCE_HANDLE_ID = "source";
/** Handle id for the target (incoming) connection; must match edge targetHandle. */
export const TREE_NODE_TARGET_HANDLE_ID = "target";
