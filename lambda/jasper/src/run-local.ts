/**
 * Run ingestion locally: load raw_documents/*.json or read event from stdin.
 * Usage:
 *   npx tsx src/run-local.ts [path/to/raw_documents]
 *   echo '{"documents":[...]}' | npx tsx src/run-local.ts
 */
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { handler } from "./handler.js";
import type { RawDocument } from "./types.js";

async function main(): Promise<void> {
  const dir = process.argv[2];

  let documents: RawDocument[];

  if (dir) {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      console.error("No .json files in", dir);
      process.exit(1);
    }
    documents = await Promise.all(
      files.map((f) =>
        readFile(join(dir, f), "utf-8").then((s) => JSON.parse(s) as RawDocument),
      ),
    );
    console.error("Loaded", documents.length, "documents from", dir);
  } else {
    const raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      process.stdin.on("data", (c) => chunks.push(c));
      process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      process.stdin.on("error", reject);
    });
    const event = JSON.parse(raw || "{}") as { documents?: RawDocument[] };
    documents = event.documents ?? [];
  }

  const result = await handler({ documents });
  console.log(JSON.stringify(JSON.parse(result.body), null, 2));
  process.exit(result.statusCode >= 400 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
