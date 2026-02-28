

const DEEPSEEK_API_KEY = "sk-8167f8f42713430f8cef268d0d9b3d53";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";


export default async function queryDeepSeek(query: string) {
    try {
        const response = await fetch(DEEPSEEK_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "user", content: query }
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content ?? "";
    } catch (error) {
        console.error("Error querying DeepSeek:", error);
        throw error;
    }
}
