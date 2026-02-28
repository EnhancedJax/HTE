/**
 * Test retrieval: embed a query → Pinecone topK → print matches.
 * Usage: npx tsx src/run-query.ts "your question"
 *        npx tsx src/run-query.ts "your question" --topK=10
 */
import { config } from "dotenv";
import { join } from "path";
import { buildContextFromMatches, retrieve } from "./retrieve.js";

config({ path: join(process.cwd(), ".env") });

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const query = args.find((a) => !a.startsWith("--")) ?? "How can parents keep children safe online?";
  const topKArg = args.find((a) => a.startsWith("--topK="));
  const topK = topKArg ? parseInt(topKArg.split("=")[1] ?? "5", 10) : 5;

  console.error("Query:", query);
  console.error("TopK:", topK);
  const matches = await retrieve(query, { topK });
  console.error("Matches:", matches.length);

  console.log(JSON.stringify({ query, topK, matches }, null, 2));
  console.error("\n--- Context string for LLM ---\n");
  console.log(buildContextFromMatches(matches));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
