import { getMockTreeData } from "@/lib/data/mock-tree";
import { NextResponse } from "next/server";

/**
 * GET /api/tree
 * Returns tree structure (nodes + edges). Layout is the client’s responsibility.
 */
export async function GET() {
  const data = getMockTreeData();
  return NextResponse.json(data);
}
