import { getMockTreeData } from "@/lib/data/mock-tree";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/tree
 * Returns tree structure (nodes + edges). Layout is the client’s responsibility.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;
  const data = getMockTreeData(query);
  return NextResponse.json(data);
}
