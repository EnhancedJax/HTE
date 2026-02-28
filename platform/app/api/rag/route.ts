import { retrieve, buildContextFromMatches } from "@/lib/rag/retrieve";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/rag
 * Body: { query: string, topK?: number }
 * Returns: { matches, context } for frontend. Use context with your LLM to get an answer.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const topK = typeof body?.topK === "number" ? Math.min(Math.max(1, body.topK), 20) : 5;

    if (!query) {
      return NextResponse.json(
        { error: "Missing or empty 'query' in body" },
        { status: 400 }
      );
    }

    const matches = await retrieve(query, { topK });
    const context = buildContextFromMatches(matches);

    return NextResponse.json({
      query,
      topK,
      matches: matches.map((m) => ({
        id: m.id,
        score: m.score,
        text: m.text,
        title: m.title,
        url: m.url,
        doc_id: m.doc_id,
      })),
      context,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/rag?q=...&topK=5
 * Same as POST but query in query string (for quick testing).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const topK = Math.min(Math.max(1, parseInt(searchParams.get("topK") ?? "5", 10) || 5), 20);

  if (!query) {
    return NextResponse.json(
      { error: "Missing query. Use ?q=your+question" },
      { status: 400 }
    );
  }

  try {
    const matches = await retrieve(query, { topK });
    const context = buildContextFromMatches(matches);

    return NextResponse.json({
      query,
      topK,
      matches: matches.map((m) => ({
        id: m.id,
        score: m.score,
        text: m.text,
        title: m.title,
        url: m.url,
        doc_id: m.doc_id,
      })),
      context,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
