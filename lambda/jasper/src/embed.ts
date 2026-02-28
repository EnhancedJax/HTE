/**
 * Hugging Face embedding client (featureExtraction). Use for chunks to be stored in vector DB.
 */
import { featureExtraction } from "@huggingface/inference";
import type { Chunk } from "./types.js";
import type { EmbeddedChunk } from "./types.js";

const DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const DEFAULT_BATCH_SIZE = 32;

export interface EmbedConfig {
  accessToken: string;
  model: string;
  batchSize?: number;
}

function getConfigFromEnv(): EmbedConfig | null {
  const accessToken = process.env.HF_TOKEN?.trim() ?? process.env.HUGGINGFACE_TOKEN?.trim();
  if (!accessToken) return null;
  return {
    accessToken,
    model: process.env.HF_EMBED_MODEL?.trim() || DEFAULT_MODEL,
    batchSize: Math.min(
      Math.max(1, parseInt(process.env.HF_EMBED_BATCH_SIZE ?? "32", 10) || 32),
      128,
    ),
  };
}

/** Normalize HF featureExtraction output to number[][] (one vector per input). */
function normalizeVectors(
  output: (number | number[] | number[][])[],
  expectedLength: number,
): number[][] {
  if (output.length !== expectedLength) {
    throw new Error(
      `Hugging Face embedding: expected ${expectedLength} vectors, got ${output.length}`,
    );
  }
  const result: number[][] = [];
  for (const item of output) {
    if (Array.isArray(item)) {
      const flat = item.flat();
      if (flat.length > 0 && typeof flat[0] === "number") {
        result.push(flat as number[]);
        continue;
      }
    }
    if (typeof item === "number") {
      result.push([item]);
      continue;
    }
    throw new Error(
      `Hugging Face embedding: unexpected vector shape`,
    );
  }
  return result;
}

/**
 * Call Hugging Face featureExtraction API. Returns vectors in same order as texts.
 */
async function hfEmbedTexts(
  texts: string[],
  config: EmbedConfig,
): Promise<number[][]> {
  const output = await featureExtraction({
    accessToken: config.accessToken,
    model: config.model,
    inputs: texts,
  });
  return normalizeVectors(output, texts.length);
}

/**
 * Embed chunks in batches and return embedded chunks.
 */
export async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  const config = getConfigFromEnv();
  if (!config) {
    throw new Error("Missing HF_TOKEN or HUGGINGFACE_TOKEN");
  }

  const batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  const out: EmbeddedChunk[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);
    const vectors = await hfEmbedTexts(texts, config);

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
