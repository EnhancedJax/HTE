/**
 * Test only: crawler docs → chunk → embed (Hugging Face). No Pinecone.
 * Use to verify "crawling docs could pass to embedding model".
 * Usage: npx tsx src/run-embed-only.ts [path/to/raw_documents]
 *        Default: ./raw_documents
 */
import { config } from "dotenv";
import { join } from "path";
import { readFile, readdir } from "fs/promises";
import { chunkDocuments } from "./chunk.js";
import { normalizeToDocuments } from "./crawler-to-docs.js";
import { embedChunks } from "./embed.js";
import type { IngestEvent, RawDocument } from "./types.js";

config({ path: join(process.cwd(), ".env") });

async function loadDocuments(dir: string): Promise<RawDocument[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  if (files.length === 0) throw new Error(`No .json files in ${dir}`);
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
  console.error("Loading from:", dir);
  const documents = await loadDocuments(dir);
  console.error("Documents:", documents.length);
  const chunks = chunkDocuments(documents as RawDocument[]);
  console.error("Chunks:", chunks.length);
  const embedded = await embedChunks(chunks);
  console.error("Embedded:", embedded.length, "vectors, dim:", embedded[0]?.embedding?.length ?? 0);
  console.log(JSON.stringify({ ok: true, documents: documents.length, chunks: chunks.length, embedded: embedded.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
