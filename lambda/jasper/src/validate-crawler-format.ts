/**
 * Validate that a JSON file or directory matches the RawDocument contract for the crawler.
 * Usage: npx tsx src/validate-crawler-format.ts <file.json | dir>
 */
import "dotenv/config";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { RawDocument } from "./types.js";

function validateOne(doc: unknown, index: number): string[] {
  const errs: string[] = [];
  if (doc === null || typeof doc !== "object") {
    errs.push(`[${index}] not an object`);
    return errs;
  }
  const d = doc as Record<string, unknown>;
  if (typeof d.doc_id !== "string" || !d.doc_id.trim()) {
    errs.push(`[${index}] doc_id must be a non-empty string`);
  }
  if (typeof d.text !== "string") {
    errs.push(`[${index}] text must be a string`);
  } else if (!d.text.trim()) {
    errs.push(`[${index}] text must not be empty`);
  }
  if (d.title !== undefined && typeof d.title !== "string") {
    errs.push(`[${index}] title must be string if present`);
  }
  if (d.url !== undefined && typeof d.url !== "string") {
    errs.push(`[${index}] url must be string if present`);
  }
  if (d.source_type !== undefined && typeof d.source_type !== "string") {
    errs.push(`[${index}] source_type must be string if present`);
  }
  return errs;
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx src/validate-crawler-format.ts <file.json | dir>");
    process.exit(1);
  }

  let documents: RawDocument[] = [];
  try {
    const stat = await import("fs/promises").then((fs) => fs.stat(path));
    if (stat.isDirectory()) {
      const files = (await readdir(path)).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        const s = await readFile(join(path, f), "utf-8");
        const doc = JSON.parse(s) as unknown;
        documents.push(doc as RawDocument);
      }
    } else {
      const s = await readFile(path, "utf-8");
      const parsed = JSON.parse(s) as unknown;
      if (Array.isArray(parsed)) {
        documents = parsed as RawDocument[];
      } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { documents?: unknown }).documents)) {
        documents = (parsed as { documents: RawDocument[] }).documents;
      } else {
        documents = [parsed as RawDocument];
      }
    }
  } catch (e) {
    console.error("Read error:", e);
    process.exit(1);
  }

  const allErrs: string[] = [];
  documents.forEach((doc, i) => allErrs.push(...validateOne(doc, i)));

  if (allErrs.length > 0) {
    console.error("Validation FAILED (crawler format):");
    allErrs.forEach((e) => console.error("  ", e));
    process.exit(1);
  }
  console.log("OK: %d document(s) match crawler contract (RawDocument).", documents.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
