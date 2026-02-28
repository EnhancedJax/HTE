/**
 * E2E test: load crawler-format data → chunk → embed (Hugging Face) → upsert (Pinecone).
 * Requires lambda/jasper/.env with HF_* and PINECONE_* set.
 * Usage: npx tsx src/test-e2e.ts [path/to/raw_documents]
 *        Default path: ./raw_documents
 */
import { config } from "dotenv";
import { join } from "path";
import { readFile, readdir } from "fs/promises";

// Load .env from cwd (lambda/jasper when run via npm run from that dir)
config({ path: join(process.cwd(), ".env") });
import { normalizeToDocuments } from "./crawler-to-docs.js";
import { handler } from "./handler.js";
import type { IngestEvent, RawDocument } from "./types.js";

async function loadDocuments(dir: string): Promise<RawDocument[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    throw new Error(`No .json files in ${dir}`);
  }
  const perFile = await Promise.all(
    files.map(async (f) => {
      const s = await readFile(join(dir, f), "utf-8");
      const parsed = JSON.parse(s) as IngestEvent | RawDocument;
      if (parsed && typeof parsed === "object" && "Results" in parsed && parsed.Results) {
        return normalizeToDocuments(parsed as IngestEvent);
      }
      return [parsed as RawDocument];
    }),
  );
  return perFile.flat();
}

async function main(): Promise<void> {
  const dir = process.argv[2] ?? join(process.cwd(), "raw_documents");
  console.error("Loading documents from:", dir);

  const documents = await loadDocuments(dir);
  console.error("Documents loaded:", documents.length);
  documents.forEach((d, i) => {
    console.error(`  [${i}] doc_id=%s title=%s text_len=%d`, d.doc_id, d.title ?? "(none)", d.text?.length ?? 0);
  });

  const result = await handler({ documents });
  const body = JSON.parse(result.body);

  if (result.statusCode >= 400) {
    console.error("Ingestion failed:", body);
    process.exit(1);
  }

  console.log(JSON.stringify(body, null, 2));
  console.error("Done. documents_processed=%s chunks_upserted=%s index_name=%s", body.documents_processed, body.chunks_upserted, body.index_name);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
