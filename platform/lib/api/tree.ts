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

function isAtLeastAsComplete(
  candidate: TreeExpandResponse,
  baseline: TreeExpandResponse | null,
): boolean {
  if (!baseline) return true;
  if (candidate.nodes.length < baseline.nodes.length) return false;
  if (candidate.edges.length < baseline.edges.length) return false;
  return true;
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
  const safeEdges = edges.filter(
    (edge) => existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target),
  );

  return {
    query,
    nodes: withRootNodes,
    edges: safeEdges,
  };
}

function normalizeExpandPayload(raw: unknown, parentId: string): TreeExpandResponse | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const nodeValues = Array.isArray(obj.nodes) ? obj.nodes : [];
  const nodes: TreeExpandResponse["nodes"] = [];
  for (const value of nodeValues) {
    const nodeObj = asRecord(value);
    if (!nodeObj) continue;

    const id = asString(nodeObj.id);
    const type = asString(nodeObj.type) ?? "treeNode";
    const dataObj = asRecord(nodeObj.data) ?? {};
    const label = asString(dataObj.label);
    const level = asTreeLevel(dataObj.level);
    if (!id || !label || !level || id === parentId) continue;

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
  const edges: TreeExpandResponse["edges"] = uniqueNodes.map((node) => ({
    id: `${parentId}--${node.id}`,
    source: parentId,
    target: node.id,
  }));
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

function stripDanglingJsonTail(source: string): string {
  let out = source;
  // Remove unfinished key-value pairs at the tail, e.g. `"summary":` or `,"summary":`
  out = out.replace(/,?\s*"[^"]*"\s*:\s*$/g, "");
  // Remove trailing comma at the tail if present
  out = out.replace(/,\s*$/g, "");
  // Remove unterminated escaped backslash tail
  out = out.replace(/\\$/g, "");
  return out;
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
  const parsedFixed = tryParseJsonCandidate(fixedStructure);
  if (parsedFixed) return parsedFixed;

  // Recovery for mid-stream partial fields (often long `summary` strings):
  // progressively trim an incomplete tail and re-close structures so already
  // completed nodes can still be parsed and rendered incrementally.
  const minLength = Math.max(0, withoutTrailingCommas.length - 8000);
  for (let i = withoutTrailingCommas.length - 1; i >= minLength; i -= 1) {
    const partial = stripDanglingJsonTail(
      withoutTrailingCommas.slice(0, i).replace(/,?\s*$/, ""),
    );
    const recovered = closeOpenStructures(partial);
    const parsed = tryParseJsonCandidate(recovered);
    if (parsed) return parsed;
  }

  return null;
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
    headers: { Accept: "application/json" },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Education API error: ${res.status} ${res.statusText}`);
  }

  const parsed = (await res.json()) as unknown;
  const normalized = normalizeTreePayload(parsed, query);
  if (!normalized) {
    throw new Error("Education API completed without valid root JSON.");
  }
  onPartial(normalized);
  return normalized;
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
    if (!isAtLeastAsComplete(normalized, latest)) continue;
    latest = normalized;
    onPartial(normalized);
  }

  buffer += decoder.decode();
  const parsed = coerceJsonFromStream(buffer);
  const normalized = parsed ? normalizeExpandPayload(parsed, nodeId) : null;
  if (
    normalized &&
    normalized.nodes.length > 0 &&
    isAtLeastAsComplete(normalized, latest)
  ) {
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
