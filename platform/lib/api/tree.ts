import type { PipelineMode } from "@/lib/query-context";
import type { TreeDataResponse, TreeExpandResponse } from "@/lib/schemas/tree";

const TREE_API_PATH = "/api/tree";
const EDUCATION_API_PATH = "/api/tree/education";

function apiPathForMode(mode: PipelineMode): string {
  return mode === "education" ? EDUCATION_API_PATH : TREE_API_PATH;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asTreeLevel(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : null;
}

function extractUnderscoredKeywords(summary: string): string[] {
  const matches = summary.match(/_([^_]+)_/g) ?? [];
  const cleaned = matches
    .map((item) => item.replaceAll("_", "").trim())
    .filter((item) => item.length > 0);
  return Array.from(new Set(cleaned));
}

function normalizeKeywordsFromData(data: Record<string, unknown>): string[] {
  const summary = typeof data.summary === "string" ? data.summary : "";
  const summaryKeywords = extractUnderscoredKeywords(summary);
  const rawKeywords = Array.isArray(data.keywords)
    ? data.keywords.filter((item): item is string => typeof item === "string")
    : [];

  // Keep keywords grounded in summary text; prefer explicit underscore highlights.
  const summaryLower = summary.toLowerCase();
  const grounded = rawKeywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0)
    .filter((keyword) => summaryLower.includes(keyword.toLowerCase()));

  const merged = [...summaryKeywords, ...grounded];
  return Array.from(new Set(merged)).slice(0, 4);
}

function uniqById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function normalizeTreePayload(raw: unknown, query: string): TreeDataResponse | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const nodeValues = Array.isArray(obj.nodes) ? obj.nodes : [];
  const edgeValues = Array.isArray(obj.edges) ? obj.edges : [];

  const mappedNodes: TreeDataResponse["nodes"] = [];
  for (const value of nodeValues) {
    const nodeObj = asRecord(value);
    if (!nodeObj) continue;

    const nodeId = asString(nodeObj.id);
    const nodeType = asString(nodeObj.type) ?? "treeNode";
    const dataObj = asRecord(nodeObj.data) ?? {};

    const label = asString(dataObj.label);
    const level = asTreeLevel(dataObj.level);
    if (!nodeId || !label || !level) continue;

    mappedNodes.push({
      id: nodeId,
      type: nodeType,
      data: {
        ...dataObj,
        label,
        level,
        keywords: normalizeKeywordsFromData(dataObj),
      },
    });
  }
  const nodes = uniqById(mappedNodes);

  const mappedEdges: TreeDataResponse["edges"] = edgeValues
    .map((value) => {
      const edgeObj = asRecord(value);
      if (!edgeObj) return null;
      const id = asString(edgeObj.id);
      const source = asString(edgeObj.source);
      const target = asString(edgeObj.target);
      if (!id || !source || !target) return null;
      return { id, source, target };
    })
    .filter((edge): edge is TreeDataResponse["edges"][number] => edge !== null);
  const edges = uniqById(mappedEdges);

  const rootNode: TreeDataResponse["nodes"][number] = {
    id: "root",
    type: "treeNode",
    data: {
      label: query,
      level: 1,
      metadata: { type: "root" },
    },
  };

  const withRootNodes = nodes.some((node) => node.id === "root")
    ? nodes.map((node) =>
        node.id === "root"
          ? {
              ...node,
              type: "treeNode",
              data: { ...node.data, level: 1 as const, label: query },
            }
          : node,
      )
    : [rootNode, ...nodes];

  const existingNodeIds = new Set(withRootNodes.map((node) => node.id));
  let safeEdges = edges.filter(
    (edge) => existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target),
  );

  if (safeEdges.length === 0) {
    const level2 = withRootNodes.filter((node) => node.data.level === 2);
    const level3 = withRootNodes.filter((node) => node.data.level === 3);
    const inferredEdges: TreeDataResponse["edges"] = [];

    for (const node of level2) {
      inferredEdges.push({
        id: `root--${node.id}`,
        source: "root",
        target: node.id,
      });
    }
    const chunkSize = level2.length > 0 ? Math.ceil(level3.length / level2.length) : 0;
    level3.forEach((node, index) => {
      const parent = level2[Math.floor(index / Math.max(chunkSize, 1))];
      if (!parent) return;
      inferredEdges.push({
        id: `${parent.id}--${node.id}`,
        source: parent.id,
        target: node.id,
      });
    });
    safeEdges = inferredEdges;
  }

  // Education root tree contract:
  // - one layer only (root + direct children)
  // - max 4 children
  const finalRootNode =
    withRootNodes.find((node) => node.id === "root") ?? {
      id: "root",
      type: "treeNode",
      data: { label: query, level: 1 as const, metadata: { type: "root" } },
    };

  const level2Nodes = withRootNodes.filter(
    (node) => node.id !== "root" && node.data.level === 2,
  );

  const edgeTargetsFromRoot = safeEdges
    .filter((edge) => edge.source === "root")
    .map((edge) => edge.target);

  const preferredChildren = edgeTargetsFromRoot
    .map((targetId) => level2Nodes.find((node) => node.id === targetId))
    .filter(
      (node): node is TreeDataResponse["nodes"][number] => node !== undefined,
    );

  const fallbackChildren = level2Nodes.filter(
    (node) => !preferredChildren.some((preferred) => preferred.id === node.id),
  );

  const selectedChildren = [...preferredChildren, ...fallbackChildren].slice(0, 4);
  const selectedChildIds = new Set(selectedChildren.map((node) => node.id));

  safeEdges = selectedChildren.map((node) => ({
    id: `root--${node.id}`,
    source: "root",
    target: node.id,
  }));

  return {
    query,
    nodes: [finalRootNode, ...selectedChildren.filter((node) => selectedChildIds.has(node.id))],
    edges: safeEdges,
  };
}

function normalizeExpandPayload(raw: unknown, parentId: string): TreeExpandResponse | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const nodeValues = Array.isArray(obj.nodes) ? obj.nodes : [];
  const edgeValues = Array.isArray(obj.edges) ? obj.edges : [];

  const nodes: TreeExpandResponse["nodes"] = [];
  for (const value of nodeValues) {
    const nodeObj = asRecord(value);
    if (!nodeObj) continue;

    const id = asString(nodeObj.id);
    const type = asString(nodeObj.type) ?? "treeNode";
    const dataObj = asRecord(nodeObj.data) ?? {};
    const label = asString(dataObj.label);
    const level = asTreeLevel(dataObj.level);
    if (!id || !label || !level) continue;

    nodes.push({
      id,
      type,
      data: {
        ...dataObj,
        label,
        level,
        keywords: normalizeKeywordsFromData(dataObj),
      },
    });
  }
  const uniqueNodes = uniqById(nodes);
  const nodeIds = new Set<string>([parentId, ...uniqueNodes.map((node) => node.id)]);

  let edges: TreeExpandResponse["edges"] = edgeValues
    .map((value) => {
      const edgeObj = asRecord(value);
      if (!edgeObj) return null;
      const id = asString(edgeObj.id);
      const source = asString(edgeObj.source);
      const target = asString(edgeObj.target);
      if (!id || !source || !target) return null;
      if (!nodeIds.has(source) || !nodeIds.has(target)) return null;
      return { id, source, target };
    })
    .filter((edge): edge is TreeExpandResponse["edges"][number] => edge !== null);

  if (edges.length === 0) {
    edges = uniqueNodes.map((node) => ({
      id: `${parentId}--${node.id}`,
      source: parentId,
      target: node.id,
    }));
  }

  return { nodes: uniqueNodes, edges: uniqById(edges) };
}

function tryParseJsonCandidate(candidate: string): unknown | null {
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function extractJsonBody(rawText: string): string | null {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  const body = rawText.slice(start, end + 1);
  return body.replace(/```json|```/gi, "").trim();
}

function closeOpenStructures(source: string): string {
  let inString = false;
  let escaped = false;
  let openBraces = 0;
  let openBrackets = 0;

  for (const char of source) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") openBraces += 1;
    if (char === "}" && openBraces > 0) openBraces -= 1;
    if (char === "[") openBrackets += 1;
    if (char === "]" && openBrackets > 0) openBrackets -= 1;
  }

  let completed = source;
  if (inString) completed += '"';
  completed += "]".repeat(openBrackets);
  completed += "}".repeat(openBraces);
  return completed;
}

function coerceJsonFromStream(rawText: string): unknown | null {
  const direct = tryParseJsonCandidate(rawText);
  if (direct) return direct;

  const body = extractJsonBody(rawText);
  if (!body) return null;

  const directBody = tryParseJsonCandidate(body);
  if (directBody) return directBody;

  const withoutTrailingCommas = body.replace(/,\s*([}\]])/g, "$1");
  const fixedStructure = closeOpenStructures(withoutTrailingCommas);
  return tryParseJsonCandidate(fixedStructure);
}

/**
 * Fetches tree data from the server for a knowledge research query.
 * Client responsibility: call this, then apply layout before rendering.
 * @param query — optional user query (high-level topic); server may use a default if omitted.
 * @param mode  — pipeline mode: "research" (default) or "education" (Gemini-powered).
 */
export async function fetchTreeData(
  query?: string,
  mode: PipelineMode = "research",
  signal?: AbortSignal,
): Promise<TreeDataResponse> {
  const basePath = apiPathForMode(mode);
  const url = new URL(basePath, window.location.origin);
  if (query?.trim()) url.searchParams.set("q", query.trim());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Tree API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TreeDataResponse;
  return data;
}

export async function streamEducationTreeData(
  query: string,
  onPartial: (data: TreeDataResponse) => void,
  signal?: AbortSignal,
): Promise<TreeDataResponse> {
  const url = new URL(EDUCATION_API_PATH, window.location.origin);
  url.searchParams.set("q", query.trim());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "text/plain" },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Education API error: ${res.status} ${res.statusText}`);
  }
  if (!res.body) {
    throw new Error("Education API did not return a readable stream.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: TreeDataResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parsed = coerceJsonFromStream(buffer);
    if (!parsed) continue;

    const normalized = normalizeTreePayload(parsed, query);
    if (!normalized) continue;
    if (!normalized.edges.some((edge) => edge.source === "root")) continue;
    latest = normalized;
    onPartial(normalized);
  }

  buffer += decoder.decode();
  const parsed = coerceJsonFromStream(buffer);
  const normalized = parsed ? normalizeTreePayload(parsed, query) : null;
  if (normalized && normalized.edges.some((edge) => edge.source === "root")) {
    latest = normalized;
    onPartial(normalized);
  }

  if (!latest) {
    throw new Error("Education stream completed without valid tree JSON.");
  }
  return latest;
}

export async function streamEducationExpandSubtree(
  nodeId: string,
  onPartial: (data: TreeExpandResponse) => void,
  query?: string,
  options?: {
    nodeLabel?: string;
    nodeSummary?: string;
    keywords?: string[];
    level?: number;
  },
  signal?: AbortSignal,
): Promise<TreeExpandResponse> {
  const url = new URL(`${EDUCATION_API_PATH}/expand`, window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain" },
    body: JSON.stringify({
      nodeId: nodeId.trim(),
      query: query?.trim(),
      nodeLabel: options?.nodeLabel,
      nodeSummary: options?.nodeSummary,
      keywords: options?.keywords,
      level: options?.level,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Education expand API error: ${res.status} ${res.statusText}`);
  }
  if (!res.body) {
    throw new Error("Education expand API did not return a readable stream.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: TreeExpandResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parsed = coerceJsonFromStream(buffer);
    if (!parsed) continue;
    const normalized = normalizeExpandPayload(parsed, nodeId);
    if (!normalized || normalized.nodes.length === 0) continue;
    latest = normalized;
    onPartial(normalized);
  }

  buffer += decoder.decode();
  const parsed = coerceJsonFromStream(buffer);
  const normalized = parsed ? normalizeExpandPayload(parsed, nodeId) : null;
  if (normalized && normalized.nodes.length > 0) {
    latest = normalized;
    onPartial(normalized);
  }

  if (!latest) {
    throw new Error("Education expand stream completed without valid subtree JSON.");
  }

  return latest;
}

/**
 * Fetches a generated subtree for a leaf node ("Dive deep").
 * Returns new nodes and edges to merge into the current tree.
 */
export async function fetchExpandSubtree(
  nodeId: string,
  _query?: string,
  mode: PipelineMode = "research",
  options?: {
    nodeLabel?: string;
    nodeSummary?: string;
    keywords?: string[];
    level?: number;
  },
): Promise<TreeExpandResponse> {
  const basePath = apiPathForMode(mode);
  const url = new URL(`${basePath}/expand`, window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      nodeId: nodeId.trim(),
      query: _query?.trim(),
      nodeLabel: options?.nodeLabel,
      nodeSummary: options?.nodeSummary,
      keywords: options?.keywords,
      level: options?.level,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      text || `Expand API error: ${res.status} ${res.statusText}`,
    );
  }

  return (await res.json()) as TreeExpandResponse;
}
