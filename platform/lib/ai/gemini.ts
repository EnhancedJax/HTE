interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const MAX_CONCURRENT = 6;
let active = 0;
const waiting: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  return new Promise<void>((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  active--;
  const next = waiting.shift();
  if (next) {
    active++;
    next();
  }
}

export async function geminiChat(
  messages: Message[],
  temperature = 0.7,
  retries = 2,
): Promise<string> {
  const baseUrl = process.env.GEMINI_API_BASE_URL;
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";

  if (!baseUrl || !apiKey) {
    throw new Error("Missing GEMINI_API_BASE_URL or GEMINI_API_KEY env vars");
  }

  await acquireSlot();
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, messages, temperature }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`Gemini API ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (e) {
        if (attempt === retries) throw e;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error("unreachable");
  } finally {
    releaseSlot();
  }
}
