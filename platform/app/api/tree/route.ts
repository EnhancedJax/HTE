import { getMockTreeData } from "@/lib/data/mock-tree";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/tree
 * Returns tree structure (nodes + edges). Layout is the client’s responsibility.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;
  // fake load 2s
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const data = getMockTreeData(query);
  return NextResponse.json(data);
}
