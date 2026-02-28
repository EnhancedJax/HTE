import { generateEducationTree } from "@/lib/ai/education-tree-generator";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/tree/education?q=<query>
 * Generates an education-focused tree using the Gemini pipeline.
 * Each node represents a key concept that can be explored deeper.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim() || "Climate Change";

  const start = Date.now();
  console.log(`[/api/tree/education] query="${query}"`);

  try {
    const treeData = await generateEducationTree(query);
    console.log(`[/api/tree/education] TOTAL: ${Date.now() - start}ms`);
    return NextResponse.json(treeData);
  } catch (error) {
    console.error("[/api/tree/education] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Education tree generation failed" },
      { status: 500 },
    );
  }
}
