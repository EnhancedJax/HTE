import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { NextRequest } from "next/server";

export const maxDuration = 45;

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const EDUCATION_TREE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["nodes", "edges"],
  properties: {
    nodes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: true,
        required: ["id", "type", "data"],
        properties: {
          id: { type: "string" },
          type: { type: "string", const: "treeNode" },
          data: {
            type: "object",
            additionalProperties: true,
            required: ["label", "level"],
            properties: {
              label: { type: "string" },
              level: { type: "integer", enum: [1, 2, 3] },
              summary: { type: "string" },
              keywords: {
                type: "array",
                minItems: 3,
                maxItems: 4,
                items: { type: "string" },
              },
              description: { type: "string" },
            },
          },
        },
      },
    },
    edges: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "source", "target"],
        properties: {
          id: { type: "string" },
          source: { type: "string" },
          target: { type: "string" },
        },
      },
    },
  },
} as const;

function buildPrompt(query: string): string {
  return [
    "Generate an education-focused mind map as JSON only.",
    "Do not output markdown, code fences, or explanatory text.",
    "",
    `Topic query: ${JSON.stringify(query)}`,
    "",
    "Requirements:",
    '- Root node must be: { "id": "root", "type": "treeNode", "data": { "label": query, "level": 1 } }',
    "- Generate only one layer of children under root (no level-3 nodes).",
    "- Generate at most 4 level-2 child nodes.",
    "- Include a concise teaching-style summary for each non-root node.",
    "- In each child summary, highlight 3-4 important words/phrases using underscore markdown syntax like _term_.",
    '- For each level-2 child, include `keywords`: the same 3-4 highlighted terms extracted from that summary (not arbitrary).',
    '- Use URL-safe ids (letters, numbers, dashes). Edge ids must follow "<source>--<target>".',
    "",
    "Return exactly one JSON object that matches this JSON schema:",
    JSON.stringify(EDUCATION_TREE_SCHEMA, null, 2),
  ].join("\n");
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return new Response("Missing DEEPSEEK_API_KEY.", { status: 500 });
  }

  const deepseek = createOpenAICompatible({
    name: "deepseek",
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
  });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim() || "Untitled Topic";

  const result = streamText({
    model: deepseek("deepseek-chat"),
    temperature: 0,
    prompt: buildPrompt(query),
  });

  return result.toTextStreamResponse({
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
