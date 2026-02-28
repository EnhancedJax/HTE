const MINIMAX_API_KEY = "sk-api-Q_TJo6by5dvgiRaVBBjFocNUKRwAxirp4VMtn6vazrRKAg7tqudKR2LRQYxTms-uF9a9G0yuUU0k6YJScno39SITFEwz7XH5uLc0agTQIWfCQRt-aLoIQaU";
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";

interface MinimaxMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface MinimaxResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

async function callMinimax(
    messages: MinimaxMessage[],
    model: string = "abab6.5s-chat"
): Promise<string> {
    const response = await fetch(MINIMAX_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
        }),
    });

    if (!response.ok) {
        throw new Error(`Minimax API error: ${response.status} ${response.statusText}`);
    }

    const data: MinimaxResponse = await response.json();
    return data.choices[0]?.message?.content ?? "";
}

// Quick test function - run with: npx tsx userProcessing.tsx
export async function testMinimax() {
    console.log("Testing Minimax API...");
    
    const response = await callMinimax([
        { role: "system", content: "You are a helpful assistant. Keep responses brief." },
        { role: "user", content: "Say hello in 5 words or less." }
    ]);
    
    console.log("Response:", response);
    return response;
}

// Uncomment to run test directly:
testMinimax().then(console.log).catch(console.error);