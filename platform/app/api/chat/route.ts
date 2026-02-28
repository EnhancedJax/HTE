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

  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: minimax("MiniMax-M2.5"),
    system:
      "You are a concise and practical assistant for a knowledge tree explorer app. Do not include <think> tags in your answer.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
