import type { TreeDataResponse, TreeExpandResponse } from "@/lib/schemas/tree";

const TREE_API_PATH = "/api/tree";

/**
 * Fetches tree data from the server for a knowledge research query.
 * Client responsibility: call this, then apply layout before rendering.
 * @param query — optional user query (high-level topic); server may use a default if omitted.
 */
export async function fetchTreeData(query?: string): Promise<TreeDataResponse> {
  const url = new URL(TREE_API_PATH, window.location.origin);
  if (query?.trim()) url.searchParams.set("q", query.trim());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Tree API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TreeDataResponse;
  return data;
}

/**
 * Fetches a generated subtree for a leaf node ("Dive deep").
 * Returns new nodes and edges to merge into the current tree.
 */
export async function fetchExpandSubtree(
  nodeId: string,
  _query?: string,
): Promise<TreeExpandResponse> {
  const url = new URL(`${TREE_API_PATH}/expand`, window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ nodeId: nodeId.trim(), query: _query?.trim() }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text || `Expand API error: ${res.status} ${res.statusText}`,
    );
  }

  return (await res.json()) as TreeExpandResponse;
}
