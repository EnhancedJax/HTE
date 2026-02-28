import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { NextRequest } from "next/server";

export const maxDuration = 45;

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const EDUCATION_ROOT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "data"],
  properties: {
    id: { type: "string", const: "root" },
    type: { type: "string", const: "treeNode" },
    data: {
      type: "object",
      additionalProperties: false,
      required: ["label", "level", "summary", "keywords"],
      properties: {
        label: { type: "string" },
        level: { type: "integer", const: 1 },
        summary: { type: "string" },
        keywords: {
          type: "array",
          minItems: 3,
          maxItems: 4,
          items: { type: "string" },
        },
      },
    },
  },
} as const;

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Model output did not include a JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function isRootNodePayload(value: unknown): value is {
  id: "root";
  type: "treeNode";
  data: { label: string; level: 1; summary: string; keywords: string[] };
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (obj.id !== "root" || obj.type !== "treeNode") return false;
  const data = obj.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const dataObj = data as Record<string, unknown>;
  if (typeof dataObj.label !== "string" || dataObj.label.trim().length === 0) {
    return false;
  }
  if (dataObj.level !== 1) return false;
  if (
    typeof dataObj.summary !== "string" ||
    dataObj.summary.trim().length === 0
  ) {
    return false;
  }
  if (!Array.isArray(dataObj.keywords)) return false;
  const keywords = dataObj.keywords.filter(
    (item): item is string => typeof item === "string",
  );
  return keywords.length >= 3;
}

function buildPrompt(query: string): string {
  return [
    "Generate an education-focused ROOT node for a mind-map app as JSON only.",
    "Do not output markdown, code fences, or explanatory text.",
    "",
    `Topic query: ${JSON.stringify(query)}`,
    "",
    "Requirements:",
    '- Return exactly one node with id="root", type="treeNode", data.level=1.',
    "- data.label must equal the topic query.",
    "- data.summary should teach the topic in 1-2 concise sentences.",
    "- In data.summary, highlight exactly 3 important words/phrases using underscore markdown, e.g. _term_.",
    "- data.keywords must contain the same 3 highlighted terms from summary, in plain text (without underscores).",
    "",
    "Return exactly one JSON object that matches this JSON schema:",
    JSON.stringify(EDUCATION_ROOT_SCHEMA, null, 2),
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

  try {
    const result = await generateText({
      model: deepseek("deepseek-chat"),
      temperature: 0,
      prompt: buildPrompt(query),
      maxOutputTokens: 500,
    });

    const parsed = extractJsonObject(result.text);
    if (!isRootNodePayload(parsed)) {
      return new Response(
        "Education API returned invalid root-node JSON shape.",
        {
          status: 502,
        },
      );
    }

    return Response.json({
      query,
      nodes: [
        {
          ...parsed,
          data: {
            ...parsed.data,
            label: query,
          },
        },
      ],
      edges: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      `Education API failed to generate root node: ${message}`,
      {
        status: 502,
      },
    );
  }
}
