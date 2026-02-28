import { generateEducationExpand } from "@/lib/ai/education-tree-generator";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/tree/education/expand
 * Body: { nodeId: string, nodeLabel?: string, query?: string, count?: number }
 * Generates sub-concept nodes for a leaf in the education tree.
 */
export async function POST(request: NextRequest) {
  let body: {
    nodeId?: string;
    nodeLabel?: string;
    query?: string;
    count?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nodeId = body?.nodeId?.trim();
  if (!nodeId) {
    return NextResponse.json({ error: "Missing or empty nodeId" }, { status: 400 });
  }

  try {
    const response = await generateEducationExpand(
      nodeId,
      body.nodeLabel,
      body.query,
      body.count ?? 3,
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("[/api/tree/education/expand] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Education expand failed" },
      { status: 500 },
    );
  }
}
