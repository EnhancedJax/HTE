/**
 * API contract for tree data.
 * Server returns this shape; client consumes and maps to UI (e.g. React Flow).
 */

export const TREE_LEVELS = [1, 2, 3] as const;
export type TreeLevel = (typeof TREE_LEVELS)[number];

/** Payload for a single node's data (server → client). */
export interface TreeNodeDataPayload {
  label: string;
  level: TreeLevel;
  description?: string;
  metadata?: Record<string, string>;
}

/** Node in the tree API response (no position; layout is client responsibility). */
export interface TreeNodePayload {
  id: string;
  type: string;
  data: TreeNodeDataPayload;
}

/** Edge in the tree API response. */
export interface TreeEdgePayload {
  id: string;
  source: string;
  target: string;
}

/** Response shape for GET /api/tree. */
export interface TreeDataResponse {
  nodes: TreeNodePayload[];
  edges: TreeEdgePayload[];
}
