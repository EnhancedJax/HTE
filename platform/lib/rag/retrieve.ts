/**
 * RAG retrieval for platform: embed query (Hugging Face) → Pinecone topK.
 * Uses same env as lambda/jasper: HF_TOKEN, PINECONE_API_KEY, PINECONE_INDEX_NAME (e.g. hugging-face-v1).
 */
import { featureExtraction } from "@huggingface/inference";
import { Pinecone } from "@pinecone-database/pinecone";

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const DEFAULT_INDEX = "hugging-face-v1";

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

function getConfig() {
  const token = process.env.HF_TOKEN?.trim() ?? process.env.HUGGINGFACE_TOKEN?.trim();
  const apiKey = process.env.PINECONE_API_KEY?.trim();
  if (!token) throw new Error("Missing HF_TOKEN or HUGGINGFACE_TOKEN");
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY");
  return {
    token,
    apiKey,
    indexName: process.env.PINECONE_INDEX_NAME?.trim() || DEFAULT_INDEX,
  };
}

function normalizeVectors(out: (number | number[] | number[][])[], len: number): number[][] {
  if (out.length !== len) throw new Error(`Expected ${len} vectors, got ${out.length}`);
  return out.map((item) => {
    if (Array.isArray(item)) {
      const flat = item.flat();
      if (flat.length > 0 && typeof flat[0] === "number") return flat as number[];
    }
    if (typeof item === "number") return [item];
    throw new Error("Unexpected embedding shape");
  });
}

async function embedQuery(query: string): Promise<number[]> {
  const { token } = getConfig();
  const output = await featureExtraction({
    accessToken: token,
    model: HF_MODEL,
    inputs: [query],
  });
  const vectors = normalizeVectors(output, 1);
  return vectors[0]!;
}

export async function retrieve(
  query: string,
  options: { topK?: number } = {}
): Promise<RetrievedMatch[]> {
  const topK = options.topK ?? 5;
  const vector = await embedQuery(query);
  const { apiKey, indexName } = getConfig();
  const pc = new Pinecone({ apiKey });
  const index = pc.index(indexName);

  const result = await index.query({
    vector,
    topK,
    includeMetadata: true,
    includeValues: false,
  });

  return (result.matches ?? []).map((m) => {
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
}

export function buildContextFromMatches(matches: RetrievedMatch[]): string {
  return matches
    .map((m, i) => {
      const title = m.title ? `[${m.title}]` : "";
      const text = m.text ?? "(no text)";
      return `${i + 1}. ${title} ${text}`.trim();
    })
    .join("\n\n");
}
