const DEEPSEEK_API_KEY = "sk-8167f8f42713430f8cef268d0d9b3d53";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

export interface DeepSeekOptions {
  system?: string;
  temperature?: number;
  max_tokens?: number;
}

export default async function queryDeepSeek(query: string, opts: DeepSeekOptions = {}) {
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: query });

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: opts.temperature ?? 0,
        ...(opts.max_tokens ? { max_tokens: opts.max_tokens } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `DeepSeek API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("Error querying DeepSeek:", error);
    throw error;
  }
}

// console.log("Testing DeepSeek API...");
// queryDeepSeek("Given the following question: What is the current situation in Gaza?\nPlease break it down and extract a list of 5 relevant topics/keywords, each topic being only 3 words max.\nGive it in the format: Topic 1, Topic 2, Topic 3,....").then(response => {
//     console.log("Response:", response);
// }).catch(console.error);
