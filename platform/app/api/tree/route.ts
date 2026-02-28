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
<<<<<<< HEAD
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
=======
  // fake load 2s
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const data = getMockTreeData(query);
  return NextResponse.json(data);
>>>>>>> 3b68a6c9d0a8eef049a35842f5261e0a11eec772
}
