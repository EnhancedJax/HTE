import processUserQuery from "@/app/webscrapingPortal/userQueryProcess";
import { generateTreeDataWithLangChain } from "@/lib/ai/tree-generator";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextRequest, NextResponse } from "next/server";

// llama-text-embed-v2 outputs 1024-dim dense vectors by default.
// The index is created automatically on first run if it doesn't exist.
const EMBED_MODEL = "llama-text-embed-v2";
const INDEX_DIMENSION = 1024;
const TOP_K = 5;

/** Creates the Pinecone serverless index if it doesn't already exist, then waits until ready. */
async function ensureIndex(pc: Pinecone, indexName: string): Promise<void> {
  const existing = await pc.listIndexes();
  const found = existing.indexes?.some((idx) => idx.name === indexName);
  if (!found) {
    try {
      await pc.createIndex({
        name: indexName,
        dimension: INDEX_DIMENSION,
        metric: "cosine",
        spec: { serverless: { cloud: "aws", region: "us-east-1" } },
      });
    } catch (e: unknown) {
      // 409 means another request already created it — that's fine
      if (!(e instanceof Error) || !e.message.includes("409")) throw e;
    }
  }
  // Wait until the index is ready to accept writes
  let ready = false;
  while (!ready) {
    const desc = await pc.describeIndex(indexName);
    if (desc.status?.ready) {
      ready = true;
    } else {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

interface SearchResult {
  url: string;
  title: string;
  highlight: string;
}

/** Parse the large JSON blob from processUserQuery into RAG-friendly text chunks. */
function buildChunks(rawJson: string): { id: string; text: string }[] {
  const data: {
    "Relevant Topics": string[];
    Results: Record<string, Record<string, SearchResult[]>>;
  } = JSON.parse(rawJson);

  const chunks: { id: string; text: string }[] = [];

  for (const [topic, subquestions] of Object.entries(data.Results ?? {})) {
    for (const [subq, items] of Object.entries(subquestions)) {
      const highlights = items
        .map((item) => `[${item.title}] ${item.highlight}`)
        .filter(Boolean)
        .join("\n");

      const text = `Topic: ${topic}\nSubquestion: ${subq}\n\n${highlights}`;
      // Pinecone vector IDs must be ASCII, ≤512 chars
      const id = `${topic}__${subq}`
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 500);

      chunks.push({ id, text });
    }
  }

  return chunks;
}

/**
 * Embeds chunks with Pinecone, stores them in a temporary namespace,
 * queries with the user's question, and returns the top-K passages as context.
 */
async function ragRetrieve(
  pc: Pinecone,
  indexName: string,
  namespace: string,
  chunks: { id: string; text: string }[],
  query: string,
): Promise<string> {
  const index = pc.index(indexName).namespace(namespace);

  // 1. Embed passage chunks
  const passageResult = await pc.inference.embed({
    model: EMBED_MODEL,
    inputs: chunks.map((c) => c.text),
    parameters: { input_type: "passage", truncate: "END" },
  });

  // 2. Upsert into the temporary namespace (llama-text-embed-v2 is always dense)
  await index.upsert({
    records: chunks.map((chunk, i) => ({
      id: chunk.id,
      values: (passageResult.data[i] as { values: number[] }).values,
      metadata: { text: chunk.text },
    })),
  });

  // 3. Embed the user query and retrieve top-K relevant passages
  const queryResult = await pc.inference.embed({
    model: EMBED_MODEL,
    inputs: [query],
    parameters: { input_type: "query" },
  });

  const results = await index.query({
    vector: (queryResult.data[0] as { values: number[] }).values,
    topK: TOP_K,
    includeMetadata: true,
  });

  // 4. Clean up the temporary namespace
  await index.deleteAll();

  return results.matches
    .map((m) => m.metadata?.text as string)
    .filter(Boolean)
    .join("\n\n---\n\n");
}

/**
 * GET /api/tree
 * Returns tree structure (nodes + edges). Layout is the client's responsibility.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim() || "Climate Change";

  // Step 1: Gather raw research data
  const rawData = await processUserQuery(query);

  // Step 2: RAG – chunk → embed → store → retrieve relevant context
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const indexName = process.env.PINECONE_INDEX_NAME ?? "hte-rag";
  const namespace = `req-${Date.now()}`;

  await ensureIndex(pc, indexName);
  const chunks = buildChunks(rawData);
  const context = await ragRetrieve(pc, indexName, namespace, chunks, query);

  // Step 3: MiniMax generates the tree grounded by the retrieved context
  const treeData = await generateTreeDataWithLangChain({ query, context });
  return NextResponse.json(treeData);
}
