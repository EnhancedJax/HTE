/**
 * API contract for tree data.
 * Knowledge research app: user query → high-level topic (level 1) + subtopics (levels 2–3).
 * Server returns this shape; client consumes and maps to UI (e.g. React Flow).
 */

export const TREE_LEVELS = [1, 2, 3] as const;
export type TreeLevel = number;

/** Related link or source for a topic node. */
export interface RelatedLinkPayload {
  url: string;
  title?: string;
}

/** Payload for a single node's data (server → client). */
export interface TreeNodeDataPayload {
  label: string;
  level: TreeLevel;
  /** AI-generated summary for this topic/subtopic (shown when node is clicked). */
  summary?: string;
  /** Optional short description (legacy or alternate). */
  description?: string;
  /** Image URLs for this node (displayed in node detail). */
  images?: string[];
  /** Related links or sources. */
  relatedLinks?: RelatedLinkPayload[];
  /** 3-4 highlighted learning keywords used for quick expansion. */
  keywords?: string[];
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
  /** The user's original query (high-level topic). */
  query: string;
  nodes: TreeNodePayload[];
  edges: TreeEdgePayload[];
}

/** Response shape for POST /api/tree/expand (subtree for a leaf node). */
export interface TreeExpandResponse {
  nodes: TreeNodePayload[];
  edges: TreeEdgePayload[];
}
