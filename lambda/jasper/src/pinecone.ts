/**
 * Pinecone: create index (serverless AWS) + upsert vectors in batches.
 */
import { Pinecone } from "@pinecone-database/pinecone";
import type { EmbeddedChunk } from "./types.js";

const DEFAULT_INDEX_NAME = "hugging-face-v1";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_METRIC = "cosine";
const UPSERT_BATCH_SIZE = 100;

function getConfigFromEnv() {
  const apiKey = process.env.PINECONE_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  const indexName = process.env.PINECONE_INDEX_NAME?.trim() || DEFAULT_INDEX_NAME;
  const region = process.env.PINECONE_ENVIRONMENT?.trim() || process.env.PINECONE_REGION?.trim() || DEFAULT_REGION;
  const dim = parseInt(process.env.PINECONE_DIM ?? "384", 10);
  if (!Number.isFinite(dim) || dim < 1) throw new Error("Invalid PINECONE_DIM (must be positive integer)");
  return { apiKey, indexName, region, dimension: dim };
}

/**
 * Get or create the Pinecone index (serverless, AWS). Creates if missing.
 */
export async function getOrCreateIndex(): Promise<{ indexName: string; dimension: number }> {
  const { apiKey, indexName, region, dimension } = getConfigFromEnv();
  const pc = new Pinecone({ apiKey });

  const list = await pc.listIndexes();
  const exists = list.indexes?.some((i) => i.name === indexName);

  if (!exists) {
    const safeName = indexName.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "default-index";
    await pc.createIndex({
      name: safeName,
      dimension,
      metric: DEFAULT_METRIC as "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region,
        },
      },
      waitUntilReady: true,
    });
  }

  return { indexName, dimension };
}

/**
 * Upsert embedded chunks into the index (default namespace). Batches of 100.
 */
export async function upsertChunks(embedded: EmbeddedChunk[]): Promise<void> {
  const { apiKey, indexName } = getConfigFromEnv();
  const pc = new Pinecone({ apiKey });
  const index = pc.index(indexName);

  // Pinecone: id must be lowercase alphanumeric or '-' (no underscores)
  const sanitizeId = (s: string) => s.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "chunk";
  // Pinecone metadata: only string, number, boolean, or string[]. Store text for retrieval.
  const MAX_METADATA_TEXT = 32000; // safe for Pinecone metadata limit
  const toRecord = (c: EmbeddedChunk) => ({
    id: sanitizeId(c.id),
    values: c.embedding,
    metadata: {
      doc_id: c.metadata.doc_id,
      chunk_index: c.metadata.chunk_index,
      text: c.text.length > MAX_METADATA_TEXT ? c.text.slice(0, MAX_METADATA_TEXT) : c.text,
      ...(c.metadata.title != null && { title: String(c.metadata.title) }),
      ...(c.metadata.url != null && { url: String(c.metadata.url) }),
      ...(c.metadata.source_type != null && { source_type: String(c.metadata.source_type) }),
      ...(c.metadata.section != null && { section: String(c.metadata.section) }),
    },
  });

  for (let i = 0; i < embedded.length; i += UPSERT_BATCH_SIZE) {
    const batch = embedded.slice(i, i + UPSERT_BATCH_SIZE).map(toRecord);
    await index.upsert(batch);
  }
}

/** Metadata shape returned by query (we store text, doc_id, title, url, etc.). */
export interface RetrievedMatch {
  id: string;
  score?: number;
  text?: string;
  doc_id?: string;
  chunk_index?: number;
  title?: string;
  url?: string;
  source_type?: string;
  section?: string;
}

/**
 * Query the index by vector; returns top K matches with metadata (including text).
 */
export async function queryByVector(
  vector: number[],
  options: { topK?: number; includeMetadata?: boolean } = {},
): Promise<RetrievedMatch[]> {
  const { apiKey, indexName } = getConfigFromEnv();
  const pc = new Pinecone({ apiKey });
  const index = pc.index(indexName);
  const topK = options.topK ?? 5;
  const includeMetadata = options.includeMetadata !== false;

  const result = await index.query({
    vector,
    topK,
    includeMetadata,
    includeValues: false,
  });

  const matches = (result.matches ?? []).map((m) => {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    return {
      id: m.id ?? "",
      score: m.score,
      text: typeof meta.text === "string" ? meta.text : undefined,
      doc_id: typeof meta.doc_id === "string" ? meta.doc_id : undefined,
      chunk_index: typeof meta.chunk_index === "number" ? meta.chunk_index : undefined,
      title: typeof meta.title === "string" ? meta.title : undefined,
      url: typeof meta.url === "string" ? meta.url : undefined,
      source_type: typeof meta.source_type === "string" ? meta.source_type : undefined,
      section: typeof meta.section === "string" ? meta.section : undefined,
    };
  });

  return matches;
}
