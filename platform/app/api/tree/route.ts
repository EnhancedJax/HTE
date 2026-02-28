// import processUserQuery from "@/app/webscrapingPortal/userQueryProcess";
import { generateTreeDataWithLangChain } from "@/lib/ai/tree-generator";
import { NextRequest, NextResponse } from "next/server";

// interface SearchResult {
//   url: string;
//   title: string;
//   highlight: string;
// }

// /** Parse the JSON blob from processUserQuery into context-ready text chunks. */
// function buildChunks(rawJson: string): { id: string; text: string }[] {
//   const data: {
//     "Relevant Topics": string[];
//     Results: Record<string, Record<string, SearchResult[]>>;
//   } = JSON.parse(rawJson);
//
//   const chunks: { id: string; text: string }[] = [];
//
//   for (const [topic, subquestions] of Object.entries(data.Results ?? {})) {
//     for (const [subq, items] of Object.entries(subquestions)) {
//       const highlights = items
//         .map((item) => `[${item.title}] ${item.highlight}`)
//         .filter(Boolean)
//         .join("\n");
//
//       const text = `Topic: ${topic}\nSubquestion: ${subq}\n\n${highlights}`;
//       const id = `${topic}__${subq}`
//         .replace(/[^a-zA-Z0-9_-]/g, "-")
//         .slice(0, 500);
//
//       chunks.push({ id, text });
//     }
//   }
//
//   return chunks;
// }

/** Small helper: returns elapsed ms since a given start time. */
function elapsed(start: number) {
  return `${(Date.now() - start).toLocaleString()}ms`;
}

/**
 * GET /api/tree
 * Returns tree structure (nodes + edges). Layout is the client's responsibility.
 * Generates the tree directly via DeepSeek based on the user's query.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim() || "Climate Change";

  const reqStart = Date.now();
  console.log(`[/api/tree] query="${query}"`);

  const treeData = await generateTreeDataWithLangChain({ query });
  console.log(`[/api/tree] generateTree: ${elapsed(reqStart)}`);

  return NextResponse.json(treeData);
}
