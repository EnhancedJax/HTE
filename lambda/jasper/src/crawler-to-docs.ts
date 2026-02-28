/**
 * Convert platform crawler output (userQueryProcess.tsx / queryResultJsonExample) to RawDocument[].
 * Supports:
 * - Results[Topic][Question] = array of { url, title, highlight, image }
 * - Results[Topic][Question] = single { Source, Title, Content }
 */
import type { CrawlerResultItem, CrawlerResultSingle, RawDocument } from "./types.js";

function sanitizeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64) || "doc";
}

function isResultSingle(x: CrawlerResultItem | CrawlerResultSingle): x is CrawlerResultSingle {
  return x != null && "Content" in x && typeof (x as CrawlerResultSingle).Content === "string";
}

function itemToDoc(
  item: CrawlerResultItem | CrawlerResultSingle,
  docId: string,
): RawDocument | null {
  if (isResultSingle(item)) {
    const text = (item.Content ?? item.Title ?? "").trim();
    if (!text) return null;
    return {
      doc_id: docId,
      title: item.Title?.trim() || undefined,
      url: item.Source?.trim() || undefined,
      text,
      source_type: "web",
    };
  }
  const text = (item.highlight ?? item.title ?? "").trim();
  if (!text) return null;
  return {
    doc_id: docId,
    title: item.title?.trim() || undefined,
    url: item.url?.trim() || undefined,
    text,
    source_type: "web",
  };
}

/**
 * Flatten crawler event (User Query, Relevant Topics, Results) to RawDocument[].
 */
export function crawlerEventToDocuments(event: {
  "User Query"?: string;
  "Relevant Topics"?: string[];
  Results?: Record<string, Record<string, CrawlerResultItem[] | CrawlerResultSingle>>;
}): RawDocument[] {
  const out: RawDocument[] = [];
  const results = event.Results ?? {};
  let idx = 0;
  for (const topic of Object.keys(results)) {
    const perTopic = results[topic];
    if (!perTopic || typeof perTopic !== "object") continue;
    for (const question of Object.keys(perTopic)) {
      const val = perTopic[question];
      if (Array.isArray(val)) {
        val.forEach((item, i) => {
          const doc = itemToDoc(item, `${sanitizeId(topic)}_${sanitizeId(question)}_${i}_${idx++}`);
          if (doc) out.push(doc);
        });
      } else if (val && typeof val === "object") {
        const doc = itemToDoc(val as CrawlerResultSingle, `${sanitizeId(topic)}_${sanitizeId(question)}_${idx++}`);
        if (doc) out.push(doc);
      }
    }
  }
  return out;
}

/**
 * Normalize event: if crawler format (has Results), convert to documents; else use event.documents.
 */
export function normalizeToDocuments(event: {
  documents?: RawDocument[];
  "User Query"?: string;
  "Relevant Topics"?: string[];
  Results?: Record<string, Record<string, CrawlerResultItem[] | CrawlerResultSingle>>;
}): RawDocument[] {
  if (event.Results && typeof event.Results === "object") {
    return crawlerEventToDocuments(event);
  }
  return event.documents ?? [];
}
