"use client";

import { fetchTreeData } from "@/lib/api/tree";
import type { TreeNodeData } from "@/lib/graph-types";
import { radialTreeLayout } from "@/lib/radial-tree-layout";
import { payloadToFlowEdges, payloadToFlowNodes } from "@/lib/tree-map";
import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

export type TreeLayoutOptions = {
  rootId: string;
  centerX?: number;
  centerY?: number;
  radiusStep?: number;
  nodeWidth?: number;
  nodeHeight?: number;
};

const LAYOUT_OPTIONS = {
  rootId: "root",
  centerX: 400,
  centerY: 350,
  radiusStep: 400,
  nodeWidth: 150,
  nodeHeight: 50,
};

export type TreeDataStatus = "idle" | "loading" | "success" | "error";

export interface UseTreeDataResult {
  nodes: Node<TreeNodeData>[];
  edges: Edge[];
  status: TreeDataStatus;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches tree data from the API, maps to React Flow shape, and applies radial layout.
 * Server owns data; client owns fetch, mapping, and layout.
 * @param query — optional user search query (high-level topic) for knowledge research.
 */
export function useTreeData(query?: string): UseTreeDataResult {
  const [nodes, setNodes] = useState<Node<TreeNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [status, setStatus] = useState<TreeDataStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchTreeData(query);
      const flowNodes = payloadToFlowNodes(data.nodes);
      const flowEdges = payloadToFlowEdges(data.edges);
      const layoutedNodes = radialTreeLayout(
        flowNodes,
        flowEdges,
        LAYOUT_OPTIONS,
      );
      setNodes(layoutedNodes);
      setEdges(flowEdges);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  return { nodes, edges, status, error, refetch: load };
}
