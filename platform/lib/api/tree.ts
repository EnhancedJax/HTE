import type { TreeDataResponse } from "@/lib/schemas/tree";

const TREE_API_PATH = "/api/tree";

/**
 * Fetches tree data from the server.
 * Client responsibility: call this, then apply layout before rendering.
 */
export async function fetchTreeData(): Promise<TreeDataResponse> {
  const res = await fetch(TREE_API_PATH, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Tree API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TreeDataResponse;
  return data;
}
