import type {
  TreeDataResponse,
  TreeEdgePayload,
  TreeExpandResponse,
  TreeLevel,
  TreeNodePayload,
} from "@/lib/schemas/tree";
import queryMiniMax from "@/app/webscrapingPortal/minimaxPortal";

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
          data: { ...(data as unknown as TreeNodePayload["data"]), label, level: level as TreeLevel },
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
  let safeEdges = filterEdgesToExistingNodes(edges, nodeIds);

  // Fallback: if the LLM returned no edges, infer them from node levels.
  // Distribute level-3 nodes evenly (in order) across level-2 nodes.
  if (safeEdges.length === 0) {
    const level2 = nodes.filter((n) => n.data.level === 2);
    const level3 = nodes.filter((n) => n.data.level === 3);
    const inferred: TreeEdgePayload[] = [];
    for (const n2 of level2) {
      inferred.push({ id: `root--${n2.id}`, source: "root", target: n2.id });
    }
    const chunkSize = level2.length > 0 ? Math.ceil(level3.length / level2.length) : 0;
    level3.forEach((n3, i) => {
      const parent = level2[Math.floor(i / chunkSize)];
      if (parent) {
        inferred.push({ id: `${parent.id}--${n3.id}`, source: parent.id, target: n3.id });
      }
    });
    safeEdges = inferred;
  }

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
              data: { ...n.data, label: query, level: 1 as TreeLevel },
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
          data: { ...(data as unknown as TreeNodePayload["data"]), label, level: level as TreeLevel },
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
  /** Optional RAG context to ground the tree with real research findings. */
  context?: string;
}

export async function generateTreeDataWithLangChain(
  opts: GenerateTreeOptions,
): Promise<TreeDataResponse> {
  const query = opts.query.trim() || "Untitled Topic";

  const contextSection = opts.context
    ? [
        "Research context (retrieved via RAG — use this to ground the tree):",
        opts.context,
        "",
      ].join("\n")
    : "";

  const prompt = [
    "You generate a 3-level knowledge tree for a research UI.",
    "Return ONLY valid JSON (no markdown, no code fences, no commentary).",
    "",
    contextSection,
    "Node constraints:",
    '- Root node: id="root", type="treeNode", data.level=1, data.label=the query string.',
    "- Exactly 3 level-2 nodes (data.level=2).",
    "- Exactly 2 level-3 nodes per level-2 node (6 total, data.level=3).",
    "- Each node data must include: label (string), level (1|2|3), summary (1-2 sentences).",
    "- IDs must be unique, URL-safe (letters/numbers/dashes only).",
    "",
    "Edge constraints — THIS IS REQUIRED:",
    "- The edges array MUST NOT be empty.",
    "- Create one edge from root to each level-2 node (3 edges).",
    "- Create one edge from each level-2 node to each of its level-3 children (6 edges).",
    "- Every edge must have: id (string), source (parent node id), target (child node id).",
    '- Edge id format: "<source>--<target>"',
    "",
    "Example edges for a tree with root → node-a → node-a-1:",
    '  { "id": "root--node-a", "source": "root", "target": "node-a" }',
    '  { "id": "node-a--node-a-1", "source": "node-a", "target": "node-a-1" }',
    "",
    "Output shape:",
    '{ "rootSummary": string, "nodes": Array<{ id, type, data: { label, level, summary } }>, "edges": Array<{ id, source, target }> }',
    "",
    `Query: ${JSON.stringify(query)}`,
  ].join("\n");

  const content = await queryMiniMax(prompt);
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

  const content = await queryMiniMax(prompt);
  const parsed = extractJsonObject(content);
  return normalizeTreeExpandResponse(parsed);
}

