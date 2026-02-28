/**
 * RAG retrieval: embed user query → Pinecone similarity search → return top chunks.
 * Use the returned chunks as context to send to an LLM.
 */
import { embedQuery } from "./embed.js";
import { queryByVector, type RetrievedMatch } from "./pinecone.js";

export type { RetrievedMatch };

const DEFAULT_TOP_K = 5;

/**
 * Retrieve relevant chunks from Pinecone for a user query.
 * Uses the same Hugging Face embedding model as ingest (e.g. all-MiniLM-L6-v2).
 */
export async function retrieve(
  query: string,
  options: { topK?: number } = {},
): Promise<RetrievedMatch[]> {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const queryVector = await embedQuery(query);
  return queryByVector(queryVector, { topK, includeMetadata: true });
}

/**
 * Build a single context string from retrieved chunks (for LLM prompt).
 */
export function buildContextFromMatches(matches: RetrievedMatch[]): string {
  return matches
    .map((m, i) => {
      const title = m.title ? `[${m.title}]` : "";
      const text = m.text ?? "(no text)";
      return `${i + 1}. ${title} ${text}`.trim();
    })
    .join("\n\n");
}
