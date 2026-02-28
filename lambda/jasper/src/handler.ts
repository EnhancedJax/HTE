/**
 * Stage 2 – Jasper: Lambda handler.
 * Event: { documents: RawDocument[] } OR crawler format { "User Query", "Relevant Topics", "Results" }.
 * 1) Normalize to RawDocument[] 2) Chunk 3) Embed (MiniMax) 4) Upsert (Pinecone)
 */
import { chunkDocuments } from "./chunk.js";
import { normalizeToDocuments } from "./crawler-to-docs.js";
import { embedChunks } from "./embed.js";
import { getOrCreateIndex, upsertChunks } from "./pinecone.js";
import type { IngestEvent, IngestResponse, RawDocument } from "./types.js";

export async function handler(event: IngestEvent): Promise<IngestResponse> {
  try {
    const docs = normalizeToDocuments(event);
    if (docs.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No documents provided" }),
      };
    }

    // 1) Chunk: recursive character splitter, ~500–800 tokens, 10–20% overlap
    const chunks = chunkDocuments(docs as RawDocument[]);
    if (chunks.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No chunks generated" }),
      };
    }

    // 2) Embed with MiniMax (batched)
    const embedded = await embedChunks(chunks);

    // 3) Ensure index exists, then upsert
    await getOrCreateIndex();
    await upsertChunks(embedded);

    const uniqueDocs = new Set(embedded.map((c) => c.metadata.doc_id)).size;
    const indexName = process.env.PINECONE_INDEX_NAME?.trim() || "child_online_safety_docs";

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Ingestion completed",
        documents_processed: uniqueDocs,
        chunks_upserted: embedded.length,
        index_name: indexName,
      }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
}
