/**
 * MiniMax embedding client (fetch). Use type "db" for chunks to be stored in vector DB.
 */
import type { Chunk } from "./types.js";
import type { EmbeddedChunk } from "./types.js";

const MINIMAX_EMBED_URL = "https://api.minimax.chat/v1/embeddings";
const DEFAULT_MODEL = "embo-01";
const DEFAULT_BATCH_SIZE = 32;

export interface EmbedConfig {
  apiKey: string;
  groupId: string;
  model?: string;
  batchSize?: number;
}

function getConfigFromEnv(): EmbedConfig | null {
  const apiKey = process.env.MINIMAX_API_KEY?.trim();
  const groupId = process.env.MINIMAX_GROUP_ID?.trim();
  if (!apiKey || !groupId) return null;
  return {
    apiKey,
    groupId,
    model: process.env.MINIMAX_EMBED_MODEL?.trim() || DEFAULT_MODEL,
    batchSize: Math.min(
      Math.max(1, parseInt(process.env.MINIMAX_EMBED_BATCH_SIZE ?? "32", 10) || 32),
      4096,
    ),
  };
}

/** Strip newlines for embedding (MiniMax recommends this). */
function stripNewLines(s: string): string {
  return s.replace(/\n/g, " ");
}

/**
 * Call MiniMax embeddings API. Returns vectors in same order as texts.
 */
async function minimaxEmbedTexts(
  texts: string[],
  config: EmbedConfig,
): Promise<number[][]> {
  const url = `${MINIMAX_EMBED_URL}?GroupId=${encodeURIComponent(config.groupId)}`;
  const body = {
    model: config.model ?? DEFAULT_MODEL,
    texts: texts.map(stripNewLines),
    type: "db" as const,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MiniMax embedding error: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as Record<string, unknown> & {
    vectors?: number[][];
    data?: Array<{ embedding?: number[] }>;
    embeddings?: number[][];
  };
  let vectors: number[][];
  if (Array.isArray(data.vectors) && data.vectors.length === texts.length) {
    vectors = data.vectors;
  } else if (Array.isArray(data.embeddings) && data.embeddings.length === texts.length) {
    vectors = data.embeddings;
  } else if (Array.isArray(data.data) && data.data.length === texts.length) {
    vectors = data.data.map((d: { embedding?: number[] }) => d.embedding ?? []);
    if (vectors.some((v) => !Array.isArray(v) || v.length === 0)) {
      throw new Error("MiniMax embedding response: data[].embedding invalid");
    }
  } else {
    const keys = Object.keys(data).join(", ");
    throw new Error(
      `MiniMax embedding response: expected vectors/embeddings/data (length ${texts.length}). Keys: ${keys}`,
    );
  }
  return vectors;
}

/**
 * Embed chunks in batches and return embedded chunks.
 */
export async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  const config = getConfigFromEnv();
  if (!config) {
    throw new Error("Missing MINIMAX_API_KEY or MINIMAX_GROUP_ID");
  }

  const batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  const out: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);
    const vectors = await minimaxEmbedTexts(texts, config);

    for (let j = 0; j < batch.length; j++) {
      const c = batch[j]!;
      out.push({
        id: c.id,
        text: c.text,
        embedding: vectors[j]!,
        metadata: {
          doc_id: c.doc_id,
          chunk_index: c.chunk_index,
          title: c.metadata.title,
          url: c.metadata.url,
          source_type: c.metadata.source_type,
          section: c.metadata.section,
        },
      });
    }
  }

  return out;
}
