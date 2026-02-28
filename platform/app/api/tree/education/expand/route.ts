import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { NextRequest } from "next/server";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

function extractUnderscoredKeywords(summary: string): string[] {
  const matches = summary.match(/_([^_]+)_/g) ?? [];
  const cleaned = matches
    .map((item) => item.replaceAll("_", "").trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(cleaned)).slice(0, 4);
}

export async function POST(request: NextRequest) {
  let body: {
    nodeId?: string;
    nodeLabel?: string;
    nodeSummary?: string;
    query?: string;
    keywords?: string[];
    level?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const nodeId = body.nodeId?.trim();
  if (!nodeId) {
    return new Response("Missing nodeId.", { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return new Response("Missing DEEPSEEK_API_KEY.", { status: 500 });
  }

  const deepseek = createOpenAICompatible({
    name: "deepseek",
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
  });

  const parentLevel = Number.isInteger(body.level) ? Math.max(2, Number(body.level)) : 2;
  const childLevel = parentLevel + 1;
  const explicitKeywords = Array.isArray(body.keywords)
    ? body.keywords
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 4)
    : [];
  const summaryKeywords = extractUnderscoredKeywords(body.nodeSummary ?? "");
  const keywords = (explicitKeywords.length > 0 ? explicitKeywords : summaryKeywords).slice(0, 4);

  const result = streamText({
    model: deepseek("deepseek-chat"),
    temperature: 0.1,
    prompt: [
      "Generate a JSON subtree expansion for an education mind-map app.",
      "Return JSON only, no markdown and no commentary.",
      `Parent node id: ${JSON.stringify(nodeId)}`,
      `Parent node label: ${JSON.stringify(body.nodeLabel ?? nodeId)}`,
      `Parent node summary: ${JSON.stringify(body.nodeSummary ?? "")}`,
      `Root topic query: ${JSON.stringify(body.query ?? "")}`,
      `Highlighted keywords to use as direct subnodes: ${JSON.stringify(keywords)}`,
      "Generate child nodes from these highlighted keywords (one node per keyword, max 4).",
      "If keyword list is empty, infer 3-4 key terms from the parent summary and use those.",
      "Node labels should closely match the keyword terms.",
      "For every generated child node summary, highlight 3-4 key terms using underscore markdown syntax like _term_.",
      "For every generated child node, include data.keywords as the same 3-4 highlighted terms from its summary.",
      `Set each generated child node level to ${childLevel}.`,
      `Each child id must start with "${nodeId}-sub-".`,
      "Output shape:",
      `{ "nodes": [{ "id": string, "type": "treeNode", "data": { "label": string, "level": ${childLevel}, "summary": string, "keywords": string[] } }], "edges": [{ "id": string, "source": string, "target": string }] }`,
    ].join("\n"),
  });

  return result.toTextStreamResponse({
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Parent-Node-Id": nodeId,
    },
  });
}
