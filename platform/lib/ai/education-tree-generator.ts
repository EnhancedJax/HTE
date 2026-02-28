/**
 * Education pipeline: uses Gemini to identify key concepts in a topic,
 * generate explanations, and discover sub-concepts — then maps the result
 * to HTE's TreeDataResponse / TreeExpandResponse format.
 *
 * Adapted from the auto-content-extension project.
 */

import type {
  TreeDataResponse,
  TreeEdgePayload,
  TreeExpandResponse,
  TreeLevel,
  TreeNodePayload,
} from "@/lib/schemas/tree";
import { geminiChat } from "./gemini";

/* ── JSON extraction helpers ──────────────────────────── */

function findBalanced(text: string, start: number, open: string, close: string): string {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    if (ch === close) { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return text.slice(start);
}

function extractJSON(raw: string): string {
  const trimmed = raw.trim();
  try { JSON.parse(trimmed); return trimmed; } catch { /* noop */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { JSON.parse(fenced[1].trim()); return fenced[1].trim(); } catch { /* noop */ }
  }
  const objIdx = trimmed.indexOf("{");
  const arrIdx = trimmed.indexOf("[");
  if (objIdx >= 0 && (arrIdx < 0 || objIdx < arrIdx)) {
    return findBalanced(trimmed, objIdx, "{", "}");
  }
  if (arrIdx >= 0) {
    return findBalanced(trimmed, arrIdx, "[", "]");
  }
  return trimmed;
}

/* ── Types ──────────────────────────────────────────────── */

interface Concept {
  phrase: string;
  reason: string;
}

interface ExplainResult {
  title: string;
  content: string;
  concepts: Concept[];
}

/* ── Gemini: identify concepts ────────────────────────── */

async function identifyConcepts(topic: string, count: number = 3): Promise<Concept[]> {
  const resp = await geminiChat(
    [
      { role: "system", content: "Return ONLY a pure JSON array, no other text." },
      {
        role: "user",
        content: [
          `Identify the ${count} most important sub-concepts or key terms that someone learning about "${topic}" would need to understand.`,
          `Choose specific, meaningful concepts (not generic words).`,
          "",
          `Return format: [{"phrase":"concept name","reason":"why a learner might find this confusing or important"}]`,
        ].join("\n"),
      },
    ],
    0.3,
  );

  try {
    const parsed = JSON.parse(extractJSON(resp));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c: Concept) => c.phrase && c.phrase.length >= 2)
      .slice(0, count);
  } catch {
    console.error("[education] identifyConcepts parse fail", resp);
    return [];
  }
}

/* ── Gemini: explain concept + find sub-concepts ──────── */

async function generateExplainAndIdentify(
  concept: string,
  parentTopic: string,
  reason: string,
  subConceptCount: number = 2,
): Promise<ExplainResult> {
  const resp = await geminiChat(
    [
      {
        role: "system",
        content: "You are a teacher skilled at explaining concepts with concise examples. Return ONLY a pure JSON object, no markdown.",
      },
      {
        role: "user",
        content: [
          `A learner studying "${parentTopic}" is confused about "${concept}" (${reason}).`,
          "",
          "Please:",
          "1. Write a 2-3 sentence explanation with a concrete example",
          `2. Identify ${subConceptCount} important sub-concepts within your explanation that could be explored further`,
          "   - Each phrase MUST appear verbatim in your content text",
          "",
          'Return JSON: {"title":"What is X?","content":"X is...","concepts":[{"phrase":"exact phrase from content","reason":"why important"}]}',
        ].join("\n"),
      },
    ],
    0.7,
  );

  try {
    const parsed = JSON.parse(extractJSON(resp));
    const content: string = parsed.content || "";
    const concepts = Array.isArray(parsed.concepts)
      ? parsed.concepts
          .filter(
            (c: Concept) =>
              c.phrase && c.phrase !== concept && content.toLowerCase().includes(c.phrase.toLowerCase()),
          )
          .slice(0, subConceptCount)
      : [];
    return {
      title: parsed.title || `About "${concept}"`,
      content,
      concepts,
    };
  } catch {
    console.error("[education] generateExplainAndIdentify parse fail", resp);
    return { title: `About "${concept}"`, content: resp, concepts: [] };
  }
}

/* ── Slug helper ──────────────────────────────────────── */

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/* ── Main: generate full education tree ───────────────── */

export async function generateEducationTree(query: string): Promise<TreeDataResponse> {
  const topic = query.trim() || "Untitled Topic";
  console.log(`[education] generating tree for: "${topic}"`);

  const l2Concepts = await identifyConcepts(topic, 3);
  console.log(`[education] found ${l2Concepts.length} level-2 concepts`);

  if (l2Concepts.length === 0) {
    return {
      query: topic,
      nodes: [
        { id: "root", type: "treeNode", data: { label: topic, level: 1, summary: `Overview of ${topic}.` } },
      ],
      edges: [],
    };
  }

  const rootNode: TreeNodePayload = {
    id: "root",
    type: "treeNode",
    data: { label: topic, level: 1, summary: `Explore the key concepts of ${topic}.` },
  };

  const nodes: TreeNodePayload[] = [rootNode];
  const edges: TreeEdgePayload[] = [];

  const l2Results = await Promise.all(
    l2Concepts.map(async (concept) => {
      const result = await generateExplainAndIdentify(concept.phrase, topic, concept.reason, 2);
      return { concept, result };
    }),
  );

  for (const { concept, result } of l2Results) {
    const l2Id = toSlug(concept.phrase) || `l2-${nodes.length}`;

    const l2Node: TreeNodePayload = {
      id: l2Id,
      type: "treeNode",
      data: {
        label: concept.phrase,
        level: 2 as TreeLevel,
        summary: result.content,
        metadata: { educationTitle: result.title },
      },
    };
    nodes.push(l2Node);
    edges.push({ id: `root--${l2Id}`, source: "root", target: l2Id });

    for (const subConcept of result.concepts.slice(0, 2)) {
      const l3Id = `${l2Id}--${toSlug(subConcept.phrase) || `l3-${nodes.length}`}`;

      const l3Node: TreeNodePayload = {
        id: l3Id,
        type: "treeNode",
        data: {
          label: subConcept.phrase,
          level: 3 as TreeLevel,
          summary: subConcept.reason,
          metadata: {
            parentConcept: concept.phrase,
            educationReason: subConcept.reason,
          },
        },
      };
      nodes.push(l3Node);
      edges.push({ id: `${l2Id}--${l3Id}`, source: l2Id, target: l3Id });
    }

    console.log(`[education] ✓ "${concept.phrase}" → ${result.concepts.length} sub-concepts`);
  }

  console.log(`[education] tree complete: ${nodes.length} nodes, ${edges.length} edges`);
  return { query: topic, nodes, edges };
}

/* ── Expand: generate subtree for a leaf node ─────────── */

export async function generateEducationExpand(
  nodeId: string,
  nodeLabel?: string,
  query?: string,
  count: number = 3,
): Promise<TreeExpandResponse> {
  const label = nodeLabel?.trim() || nodeId;
  const parentTopic = query?.trim() || label;

  const concepts = await identifyConcepts(label, count);

  if (concepts.length === 0) {
    const fallbackConcepts = await identifyConcepts(`aspects of ${label} in the context of ${parentTopic}`, count);
    if (fallbackConcepts.length === 0) {
      return { nodes: [], edges: [] };
    }
    concepts.push(...fallbackConcepts);
  }

  const nodes: TreeNodePayload[] = [];
  const edges: TreeEdgePayload[] = [];

  const results = await Promise.all(
    concepts.slice(0, count).map(async (concept) => {
      const result = await generateExplainAndIdentify(concept.phrase, parentTopic, concept.reason, 0);
      return { concept, result };
    }),
  );

  for (const { concept, result } of results) {
    const childId = `${nodeId}-sub-${toSlug(concept.phrase) || nodes.length + 1}`;
    nodes.push({
      id: childId,
      type: "treeNode",
      data: {
        label: concept.phrase,
        level: 3 as TreeLevel,
        summary: result.content,
        metadata: { parent: nodeId, expanded: "true", educationTitle: result.title },
      },
    });
    edges.push({ id: `${nodeId}--${childId}`, source: nodeId, target: childId });
  }

  return { nodes, edges };
}
