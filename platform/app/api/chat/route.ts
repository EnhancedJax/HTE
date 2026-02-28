import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

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
    topicQuery,
  }: {
    messages: UIMessage[];
    treeContextText?: string;
    selectedNodeLabel?: string;
    selectedNodeSummary?: string;
    topicQuery?: string;
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

  if (selectedNodeLabel) {
    const nodeDesc = selectedNodeSummary
      ? `"${selectedNodeLabel}" — ${selectedNodeSummary}`
      : `"${selectedNodeLabel}"`;
    contextParts.push(
      `The user is currently viewing the node: ${nodeDesc}`,
    );
  }

  const contextBlock =
    contextParts.length > 0
      ? `\n\n--- CURRENT CONTEXT ---\n${contextParts.join("\n\n")}\n--- END CONTEXT ---`
      : "";

  const system = `You are a concise and practical assistant for a knowledge tree explorer app. Answer questions about the topic, its sub-topics, and the node the user is viewing. Be specific when context is provided.${contextBlock}`;

  const result = streamText({
    model: minimax("MiniMax-M2.5"),
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
