//these are hard coded for MPV purposes and for ease of use/efficiency during hackathon
const GROUP_ID = "2027572980330009043"; 
const API_KEY = "sk-api-p5GTBzgqAGZULLv1fZOE2zwxgjnqFn5a6GrjT5nRWwo08d6ExXXg8D35D9V60ry_eEwcYDRn-kOaODsGD7zGcno34B3Y-MbKRB29Fv2Tq9h9OAE-vxtiaxs";   // Your secret API Key (starts with 'sk-...')
const API_HOST = "https://api.minimax.io";
const url = `${API_HOST}/v1/chat/completions?GroupId=${GROUP_ID}`;

function removeThinkTags(content: string): string {
    return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

async function askMiniMax(messages: {role: string, content: string}[]): Promise<string | null> {

    const headers = {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
    };

    const body = {
        model: "MiniMax-M2.5",
        messages: messages,
        temperature: 0.7,
    };

    try {
        console.log("Sending request to MiniMax...");
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorBody}`);
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            const rawReply = data.choices[0].message.content;
            const cleanReply = removeThinkTags(rawReply);
            console.log("\nMiniMax's Response (cleaned):");
            console.log(cleanReply);
            return cleanReply;
        } else {
            console.log("Unexpected API response structure:", data);
            return null;
        }

    } catch (error) {
        console.error("Error calling MiniMax API:", error);
        return null;
    }
}

askMiniMax([{role: "user", content: "Given the following question: What can you tell me about recent quantum computing technology?\nPlease break it down and extract a list of 5 relevant topics/keywords, each topic being only 3 words max.\nGive it in the format: Topic 1, Topic 2, Topic 3,...."}]);