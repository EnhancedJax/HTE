import { getMockTreeData } from "@/lib/data/mock-tree";
import { generateTreeDataWithLangChain } from "@/lib/ai/tree-generator";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/tree
 * Returns tree structure (nodes + edges). Layout is the client’s responsibility.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;
  try {
    const data = await generateTreeDataWithLangChain({
      query: query?.trim() || "Climate Change",
    });
    return NextResponse.json(data);
  } catch {
    // Fallback: keep UI functional without LLM env configured.
    const data = getMockTreeData(query);
    return NextResponse.json(data);
  }
}
