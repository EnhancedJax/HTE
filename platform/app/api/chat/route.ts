import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const GROUP_ID = "2027572980330009043";
const API_KEY =
  "sk-api-p5GTBzgqAGZULLv1fZOE2zwxgjnqFn5a6GrjT5nRWwo08d6ExXXg8D35D9V60ry_eEwcYDRn-kOaODsGD7zGcno34B3Y-MbKRB29Fv2Tq9h9OAE-vxtiaxs";

const minimax = createOpenAICompatible({
  name: "minimax",
  apiKey: API_KEY,
  baseURL: "https://api.minimax.io/v1",
  queryParams: {
    GroupId: GROUP_ID,
  },
});

export async function POST(request: Request) {
  if (!API_KEY) {
    return new Response(
      "Missing MINIMAX_API_KEY. Add it to your environment variables.",
      { status: 500 },
    );
  }

  const {
    messages,
    treeContextText,
    selectedNodeLabel,
    selectedNodeSummary,
    selectedNodesContext,
    topicQuery,
    pipelineMode,
  }: {
    messages: UIMessage[];
    treeContextText?: string;
    selectedNodeLabel?: string;
    selectedNodeSummary?: string;
    selectedNodesContext?: string;
    topicQuery?: string;
    pipelineMode?: "research" | "education";
  } = await request.json();

  const contextParts: string[] = [];

  if (topicQuery) {
    contextParts.push(`The user is exploring the topic: "${topicQuery}".`);
  }

  if (treeContextText) {
    contextParts.push(
      `The current knowledge tree structure is:\n${treeContextText}`,
    );
  }
  let selectedNodeItems: { id: string; label: string; summary?: string }[] = [];
  if (selectedNodesContext) {
    try {
      const parsed = JSON.parse(selectedNodesContext);
      if (Array.isArray(parsed)) {
        selectedNodeItems = parsed
          .filter(
            (item): item is { id?: unknown; label?: unknown; summary?: unknown } =>
              Boolean(item) && typeof item === "object",
          )
          .map((item) => ({
            id: typeof item.id === "string" ? item.id : "",
            label: typeof item.label === "string" ? item.label : "",
            summary: typeof item.summary === "string" ? item.summary : undefined,
          }))
          .filter((item) => item.label.length > 0);
      }
    } catch {
      selectedNodeItems = [];
    }
  }

  if (selectedNodeItems.length > 1) {
    const selectedNodeList = selectedNodeItems
      .map((item) =>
        item.summary
          ? `- [id=${item.id}] "${item.label}" — ${item.summary}`
          : `- [id=${item.id}] "${item.label}"`,
      )
      .join("\n");
    contextParts.push(
      `The user currently has multiple nodes selected:\n${selectedNodeList}`,
    );
  } else if (selectedNodeItems.length === 1) {
    const [item] = selectedNodeItems;
    const nodeDesc = item.summary ? `"${item.label}" — ${item.summary}` : `"${item.label}"`;
    contextParts.push(`The user is currently viewing the node: ${nodeDesc}`);
  } else if (selectedNodeLabel) {
    const nodeDesc = selectedNodeSummary
      ? `"${selectedNodeLabel}" — ${selectedNodeSummary}`
      : `"${selectedNodeLabel}"`;
    contextParts.push(
      `The user is currently viewing the node: ${nodeDesc}`,
    );
  }

  const selectedNodeIdSet = new Set(
    selectedNodeItems
      .map((item) => item.id.trim())
      .filter((nodeId) => nodeId.length > 0),
  );
  const selectedNodeIdList = Array.from(selectedNodeIdSet);
  if (selectedNodeIdList.length > 0) {
    contextParts.push(
      `Selected node IDs that can be updated: ${selectedNodeIdList.join(", ")}`,
    );
  }

  const contextBlock =
    contextParts.length > 0
      ? `\n\n--- CURRENT CONTEXT ---\n${contextParts.join("\n\n")}\n--- END CONTEXT ---`
      : "";

  const educationToolInstructions =
    pipelineMode === "education" && selectedNodeIdList.length > 0
      ? [
          "When the user asks to expand, deepen, or improve understanding of selected nodes, call the tool `update_node_summary`.",
          "Call the tool once per node that should be updated, using only ids from the selected-node list.",
          "Write the expanded summary in 2-4 concise teaching-oriented sentences.",
          "After tool calls, briefly explain what was improved.",
        ].join(" ")
      : "Do not call tools.";
  const system = `You are a concise and practical assistant for a knowledge tree explorer app. Answer questions about the topic, its sub-topics, and the node the user is viewing. Be specific when context is provided. ${educationToolInstructions}${contextBlock}`;

  const tools =
    pipelineMode === "education" && selectedNodeIdList.length > 0
      ? {
          update_node_summary: tool({
            description:
              "Update one selected node with a richer educational summary.",
            inputSchema: z.object({
              nodeId: z
                .string()
                .min(1)
                .describe("ID of a currently selected node to update."),
              expandedSummary: z
                .string()
                .min(20)
                .describe("Expanded summary text for that node."),
              keywords: z
                .array(z.string().min(1))
                .max(6)
                .optional()
                .describe("Optional key terms extracted from the new summary."),
            }),
            execute: async ({ nodeId, expandedSummary, keywords }) => {
              const normalizedNodeId = nodeId.trim();
              if (!selectedNodeIdSet.has(normalizedNodeId)) {
                return {
                  updated: false,
                  reason: "node-id-not-selected",
                  nodeId: normalizedNodeId,
                };
              }

              return {
                updated: true,
                nodeId: normalizedNodeId,
                summary: expandedSummary.trim(),
                keywords: Array.isArray(keywords)
                  ? keywords
                      .map((keyword) => keyword.trim())
                      .filter((keyword) => keyword.length > 0)
                      .slice(0, 6)
                  : undefined,
              };
            },
          }),
        }
      : undefined;

  const result = streamText({
    model: minimax("MiniMax-M2.5"),
    system,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(4),
  });

  return result.toUIMessageStreamResponse();
}
