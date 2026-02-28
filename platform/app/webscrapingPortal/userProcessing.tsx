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

    const data = await response.json();
    
    // Debug: log the actual response structure
    console.log("Minimax raw response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
        throw new Error(`Minimax API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    // Handle different possible response structures
    if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
    }
    if (data.reply) {
        return data.reply;
    }
    if (data.output) {
        return data.output;
    }
    
    throw new Error(`Unexpected response structure: ${JSON.stringify(data)}`);
}

const INPUT_PROCESSING_PROMPTS = {
    extractTopics: "Extract the main topics and keywords from the following user query. Return them as a JSON array of strings.",
}

//Returns list of questions organised by relevant topics/keywords to user query
export default async function processUserInput(userInput: string) {
    const questions: { "Relevant Topics": string[]; "Results": string | null } = {
        "Relevant Topics": [],
        "Results": null
    };

    // Get topics from Minimax
    const topicsResponse = await callMinimax([
        { role: "system", content: INPUT_PROCESSING_PROMPTS.extractTopics },
        { role: "user", content: userInput }
    ]);

    try {
        const topics = JSON.parse(topicsResponse);
        questions["Relevant Topics"] = topics;
    } catch {
        questions["Relevant Topics"] = [topicsResponse];
    }

    // For each topic, get questions (example usage)
    // const questionsResponse = await callMinimax([
    //     { role: "system", content: "Generate relevant questions for this topic." },
    //     { role: "user", content: topics[0] }
    // ]);

    return JSON.stringify(questions);
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