/**
 * Recursive character splitter: ~500–800 tokens, 10–20% overlap, preserve section boundaries.
 * Uses character length as proxy for tokens (~4 chars per token).
 */
import type { RawDocument } from "./types.js";
import type { Chunk } from "./types.js";

const DEFAULT_CHUNK_SIZE_CHARS = 2400; // ~600 tokens
const DEFAULT_OVERLAP_CHARS = 360;     // 15%
const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

export interface ChunkOptions {
  chunkSizeChars?: number;
  overlapChars?: number;
}

function splitRecursive(
  text: string,
  chunkSize: number,
  overlap: number,
  separators: string[],
): string[] {
  if (text.length <= chunkSize) return text ? [text] : [];

  const sep = separators[0] ?? "";
  const rest = separators.slice(1);

  const parts = sep ? text.split(sep) : [text];
  const chunks: string[] = [];
  let current = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const withSep = i < parts.length - 1 ? part + sep : part;

    if (current.length + withSep.length <= chunkSize) {
      current += (current ? sep : "") + part;
      continue;
    }

    if (current) {
      chunks.push(current);
      const overlapStart = Math.max(0, current.length - overlap);
      current = current.slice(overlapStart);
    }

    if (withSep.length > chunkSize && rest.length > 0) {
      const sub = splitRecursive(withSep, chunkSize, overlap, rest);
      if (sub.length > 0) {
        const last = sub[sub.length - 1]!;
        chunks.push(...sub.slice(0, -1));
        current = last;
      }
    } else {
      current = withSep;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Chunk a single document into overlapping segments.
 */
export function chunkDocument(
  doc: RawDocument,
  opts: ChunkOptions = {},
): Chunk[] {
  const chunkSize = opts.chunkSizeChars ?? DEFAULT_CHUNK_SIZE_CHARS;
  const overlap = opts.overlapChars ?? DEFAULT_OVERLAP_CHARS;

  const text = doc.text?.trim() ?? "";
  const docId = doc.doc_id ?? "";
  const title = doc.title ?? "";
  const url = doc.url ?? "";
  const sourceType = doc.source_type ?? "web";

  if (!text) return [];

  const segments = splitRecursive(text, chunkSize, overlap, SEPARATORS);
  const chunks: Chunk[] = segments.map((segment, idx) => ({
    id: `${docId}_chunk_${idx}`,
    doc_id: docId,
    chunk_index: idx,
    text: segment,
    metadata: { title, url, source_type: sourceType },
  }));

  return chunks;
}

/**
 * Chunk multiple documents.
 */
export function chunkDocuments(
  docs: RawDocument[],
  opts?: ChunkOptions,
): Chunk[] {
  const out: Chunk[] = [];
  for (const doc of docs) out.push(...chunkDocument(doc, opts));
  return out;
}
