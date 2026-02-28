import processUserQuery from "@/app/webscrapingPortal/userQueryProcess";
import { generateTreeDataWithLangChain } from "@/lib/ai/tree-generator";
import { featureExtraction } from "@huggingface/inference";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextRequest, NextResponse } from "next/server";

// sentence-transformers/all-MiniLM-L6-v2 outputs 384-dim vectors.
// The index is created automatically on first run if it doesn't exist.
const HF_MODEL = process.env.HF_EMBED_MODEL ?? "sentence-transformers/all-MiniLM-L6-v2";
const INDEX_DIMENSION = 384;
const TOP_K = 5;

/** Embed a list of texts via Hugging Face featureExtraction. */
async function hfEmbed(texts: string[]): Promise<number[][]> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("Missing HF_TOKEN environment variable");

  const output = await featureExtraction({
    accessToken: token,
    model: HF_MODEL,
    inputs: texts,
  });

  // Normalise: featureExtraction can return number | number[] | number[][]
  return (output as (number | number[] | number[][])[]).map((item) => {
    const flat = Array.isArray(item) ? (item as number[]).flat() : [item as number];
    return flat as number[];
  });
}

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

/** Small helper: returns elapsed ms since a given start time. */
function elapsed(start: number) {
  return `${(Date.now() - start).toLocaleString()}ms`;
}

/**
 * Embeds chunks with Hugging Face, stores them in a temporary Pinecone namespace,
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

  // 1. Embed passage chunks via Hugging Face
  let t = Date.now();
  const passageVectors = await hfEmbed(chunks.map((c) => c.text));
  console.log(`  [rag] HF embed passages (${chunks.length} chunks): ${elapsed(t)}`);

  // 2. Upsert into the temporary namespace
  t = Date.now();
  await index.upsert({
    records: chunks.map((chunk, i) => ({
      id: chunk.id,
      values: passageVectors[i]!,
      metadata: { text: chunk.text },
    })),
  });
  console.log(`  [rag] Pinecone upsert: ${elapsed(t)}`);

  // 3. Embed the user query via Hugging Face and retrieve top-K passages
  t = Date.now();
  const [queryVector] = await hfEmbed([query]);
  console.log(`  [rag] HF embed query: ${elapsed(t)}`);

  t = Date.now();
  const results = await index.query({
    vector: queryVector!,
    topK: TOP_K,
    includeMetadata: true,
  });
  console.log(`  [rag] Pinecone query (top ${TOP_K}): ${elapsed(t)}`);

  // 4. Clean up the temporary namespace
  t = Date.now();
  await index.deleteAll();
  console.log(`  [rag] Pinecone namespace cleanup: ${elapsed(t)}`);

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

  const reqStart = Date.now();
  console.log(`[/api/tree] query="${query}"`);

  // Step 1: Gather raw research data
  let t = Date.now();
  const rawData = await processUserQuery(query);
  console.log(`[/api/tree] step 1 – processUserQuery: ${elapsed(t)}`);

  // Step 2: RAG – chunk → embed → store → retrieve relevant context
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const indexName = process.env.PINECONE_INDEX_NAME ?? "hte-rag";
  const namespace = `req-${Date.now()}`;

  t = Date.now();
  await ensureIndex(pc, indexName);
  console.log(`[/api/tree] step 2a – ensureIndex: ${elapsed(t)}`);

  t = Date.now();
  const chunks = buildChunks(rawData);
  console.log(`[/api/tree] step 2b – buildChunks (${chunks.length} chunks): ${elapsed(t)}`);

  t = Date.now();
  const context = await ragRetrieve(pc, indexName, namespace, chunks, query);
  console.log(`[/api/tree] step 2c – ragRetrieve total: ${elapsed(t)}`);

  // Step 3: MiniMax generates the tree grounded by the retrieved context
  t = Date.now();
  const treeData = await generateTreeDataWithLangChain({ query, context });
  console.log(`[/api/tree] step 3 – generateTree: ${elapsed(t)}`);

  console.log(`[/api/tree] TOTAL: ${elapsed(reqStart)}`);
  return NextResponse.json(treeData);
}
