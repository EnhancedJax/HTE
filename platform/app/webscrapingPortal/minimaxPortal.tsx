//these are hard coded for MPV purposes and for ease of use/efficiency during hackathon
const GROUP_ID = "2027572980330009043";
const API_HOST = "https://api.minimax.io";
const url = `${API_HOST}/v1/chat/completions?GroupId=${GROUP_ID}`;

function removeThinkTags(content: string): string {
  const thinkEndIndex = content.indexOf("</think>");
  if (thinkEndIndex !== -1) {
    return content.slice(thinkEndIndex + "</think>".length).trim();
  }
  return content.trim();
}

export default async function queryMiniMax(query: string) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "MiniMax-M2.5",
        messages: [{ role: "user", content: query }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `MiniMax API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Clean the think tags from the response content
    if (data.choices && data.choices.length > 0) {
      data.choices[0].message.content = removeThinkTags(
        data.choices[0].message.content,
      );
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error querying MiniMax:", error);
    throw error;
  }
}

// console.log("Testing MiniMax API...");
// queryMiniMax("Given the following question: What is the current situation in Gaza?\nPlease break it down and extract a list of 5 relevant topics/keywords, each topic being only 3 words max.\nGive it in the format: Topic 1, Topic 2, Topic 3,....").then(response => {
//     console.log("Response:", response);
// }).catch(console.error);
