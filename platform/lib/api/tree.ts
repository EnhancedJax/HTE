import type { TreeDataResponse } from "@/lib/schemas/tree";

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
