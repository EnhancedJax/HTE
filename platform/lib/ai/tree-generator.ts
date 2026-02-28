import type {
  TreeDataResponse,
  TreeEdgePayload,
  TreeExpandResponse,
  TreeNodePayload,
} from "@/lib/schemas/tree";
import { HumanMessage } from "@langchain/core/messages";
import { createChatModelFromEnv } from "./llm";

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("LLM output did not contain a JSON object");
  }
  const slice = text.slice(start, end + 1);
  return JSON.parse(slice);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function uniqById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (!it?.id) continue;
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function filterEdgesToExistingNodes(
  edges: TreeEdgePayload[],
  nodeIds: Set<string>,
): TreeEdgePayload[] {
  return edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
}

function normalizeTreeDataResponse(
  query: string,
  raw: unknown,
): TreeDataResponse {
  const obj = raw as Record<string, unknown>;

  const nodesRaw = Array.isArray(obj.nodes) ? (obj.nodes as unknown[]) : [];
  const edgesRaw = Array.isArray(obj.edges) ? (obj.edges as unknown[]) : [];

  const nodes: TreeNodePayload[] = uniqById(
    nodesRaw
      .map((n) => n as Record<string, unknown>)
      .map((n): TreeNodePayload | null => {
        const id = asString(n.id);
        const data = (n.data ?? {}) as Record<string, unknown>;
        const label = asString(data.label);
        const level = data.level;

        if (!id || !label) return null;
        if (level !== 1 && level !== 2 && level !== 3) return null;

        return {
          id,
          type: asString(n.type) ?? "treeNode",
          data: data as TreeNodePayload["data"],
        };
      })
      .filter(Boolean) as TreeNodePayload[],
  );

  const edges: TreeEdgePayload[] = uniqById(
    edgesRaw
      .map((e) => e as Record<string, unknown>)
      .map((e): TreeEdgePayload | null => {
        const id = asString(e.id);
        const source = asString(e.source);
        const target = asString(e.target);
        if (!id || !source || !target) return null;
        return { id, source, target };
      })
      .filter(Boolean) as TreeEdgePayload[],
  );

  const nodeIds = new Set(nodes.map((n) => n.id));
  const safeEdges = filterEdgesToExistingNodes(edges, nodeIds);

  // Ensure a stable root exists and matches the query.
  const hasRoot = nodeIds.has("root");
  const rootNode: TreeNodePayload = {
    id: "root",
    type: "treeNode",
    data: {
      label: query,
      level: 1,
      summary:
        typeof obj.rootSummary === "string"
          ? (obj.rootSummary as string)
          : undefined,
      metadata: { type: "root" },
    },
  };

  const finalNodes = hasRoot
    ? nodes.map((n) =>
        n.id === "root"
          ? {
              ...n,
              type: "treeNode",
              data: { ...n.data, label: query, level: 1 },
            }
          : n,
      )
    : [rootNode, ...nodes];

  const finalNodeIds = new Set(finalNodes.map((n) => n.id));
  const finalEdges = filterEdgesToExistingNodes(safeEdges, finalNodeIds);

  return {
    query,
    nodes: finalNodes,
    edges: finalEdges,
  };
}

function normalizeTreeExpandResponse(raw: unknown): TreeExpandResponse {
  const obj = raw as Record<string, unknown>;
  const nodesRaw = Array.isArray(obj.nodes) ? (obj.nodes as unknown[]) : [];
  const edgesRaw = Array.isArray(obj.edges) ? (obj.edges as unknown[]) : [];

  const nodes: TreeNodePayload[] = uniqById(
    nodesRaw
      .map((n) => n as Record<string, unknown>)
      .map((n): TreeNodePayload | null => {
        const id = asString(n.id);
        const data = (n.data ?? {}) as Record<string, unknown>;
        const label = asString(data.label);
        const level = data.level;
        if (!id || !label) return null;
        if (level !== 1 && level !== 2 && level !== 3) return null;
        return {
          id,
          type: asString(n.type) ?? "treeNode",
          data: data as TreeNodePayload["data"],
        };
      })
      .filter(Boolean) as TreeNodePayload[],
  );

  const edges: TreeEdgePayload[] = uniqById(
    edgesRaw
      .map((e) => e as Record<string, unknown>)
      .map((e): TreeEdgePayload | null => {
        const id = asString(e.id);
        const source = asString(e.source);
        const target = asString(e.target);
        if (!id || !source || !target) return null;
        return { id, source, target };
      })
      .filter(Boolean) as TreeEdgePayload[],
  );

  const nodeIds = new Set(nodes.map((n) => n.id));
  const safeEdges = filterEdgesToExistingNodes(edges, nodeIds);

  return { nodes, edges: safeEdges };
}

export interface GenerateTreeOptions {
  query: string;
}

export async function generateTreeDataWithLangChain(
  opts: GenerateTreeOptions,
): Promise<TreeDataResponse> {
  const query = opts.query.trim() || "Untitled Topic";
  const chat = createChatModelFromEnv();
  if (!chat) {
    throw new Error("Missing LLM config (set LLM_API_KEY or OPENAI_API_KEY)");
  }

  const prompt = [
    "You generate a 3-level knowledge tree for a research UI.",
    "Return ONLY valid JSON (no markdown, no code fences, no commentary).",
    "",
    "Constraints:",
    '- Root node MUST be id "root", type "treeNode", data.level = 1, data.label = the query string.',
    "- Include exactly 3 level-2 nodes (level=2), each connected from root via an edge.",
    "- Include 2 level-3 nodes (level=3) under EACH level-2 node (total 6), connected via edges.",
    "- Each node data must include: label (string), level (1|2|3), summary (1-2 sentences).",
    "- IDs must be unique, stable, URL-safe (letters/numbers/dashes).",
    "",
    "Output shape:",
    '{ "rootSummary": string, "nodes": TreeNodePayload[], "edges": TreeEdgePayload[] }',
    "",
    `Query: ${JSON.stringify(query)}`,
  ].join("\n");

  const res = await chat.invoke([new HumanMessage(prompt)]);
  const content = typeof res.content === "string" ? res.content : String(res.content);
  const parsed = extractJsonObject(content);
  return normalizeTreeDataResponse(query, parsed);
}

export interface GenerateExpandOptions {
  /** Existing node id to expand under (edge source). */
  nodeId: string;
  /** Optional label for better context; if missing we will use nodeId. */
  nodeLabel?: string;
  /** Original user query/topic. */
  query?: string;
  /** Desired level for new nodes. Defaults to 3 for current UI. */
  level?: 2 | 3;
  /** How many nodes to add. Defaults to 3. */
  count?: number;
}

export async function generateExpandSubtreeWithLangChain(
  opts: GenerateExpandOptions,
): Promise<TreeExpandResponse> {
  const nodeId = opts.nodeId.trim();
  if (!nodeId) throw new Error("Missing nodeId");

  const nodeLabel = opts.nodeLabel?.trim() || nodeId;
  const query = opts.query?.trim() || "";
  const level = opts.level ?? 3;
  const count = Math.max(2, Math.min(5, opts.count ?? 3));

  const chat = createChatModelFromEnv();
  if (!chat) {
    throw new Error("Missing LLM config (set LLM_API_KEY or OPENAI_API_KEY)");
  }

  const prompt = [
    "You generate a small subtree expansion for a knowledge tree UI.",
    "Return ONLY valid JSON (no markdown, no code fences, no commentary).",
    "",
    "Constraints:",
    `- Create exactly ${count} new nodes, each connected from the existing parent node via an edge.`,
    `- Parent node id: ${JSON.stringify(nodeId)}`,
    `- Parent node label/context: ${JSON.stringify(nodeLabel)}`,
    `- Original user query/topic (may be empty): ${JSON.stringify(query)}`,
    `- New nodes must have data.level = ${level}`,
    "- Each node data must include: label (string), level (2|3), summary (1-2 sentences).",
    "- IDs must be unique, stable, URL-safe (letters/numbers/dashes), and MUST start with `${nodeId}-sub-` followed by a number.",
    "",
    "Output shape:",
    '{ "nodes": TreeNodePayload[], "edges": TreeEdgePayload[] }',
  ].join("\n");

  const res = await chat.invoke([new HumanMessage(prompt)]);
  const content = typeof res.content === "string" ? res.content : String(res.content);
  const parsed = extractJsonObject(content);
  return normalizeTreeExpandResponse(parsed);
}

