/**
 * Run ingestion locally: load raw_documents/*.json or read event from stdin.
 * Loads lambda/jasper/.env so MINIMAX_* and PINECONE_* are set.
 * Usage:
 *   npx tsx src/run-local.ts [path/to/raw_documents]
 *   echo '{"documents":[...]}' | npx tsx src/run-local.ts
 */
import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFile, readdir } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });
import { normalizeToDocuments } from "./crawler-to-docs.js";
import { handler } from "./handler.js";
import type { IngestEvent, RawDocument } from "./types.js";

async function main(): Promise<void> {
  const dir = process.argv[2];

  let documents: RawDocument[];

  if (dir) {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      console.error("No .json files in", dir);
      process.exit(1);
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
    documents = perFile.flat();
    console.error("Loaded", documents.length, "documents from", dir);
  } else {
    const raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      process.stdin.on("data", (c) => chunks.push(c));
      process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      process.stdin.on("error", reject);
    });
    const event = JSON.parse(raw || "{}") as IngestEvent;
    documents = normalizeToDocuments(event);
  }

  const result = await handler({ documents });
  console.log(JSON.stringify(JSON.parse(result.body), null, 2));
  process.exit(result.statusCode >= 400 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
