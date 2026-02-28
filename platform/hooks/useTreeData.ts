"use client";

import {
  fetchTreeData,
  streamEducationExpandSubtree,
  streamEducationTreeData,
} from "@/lib/api/tree";
import {
  TREE_NODE_COLUMN_GAP_PX,
  TREE_NODE_MAX_WIDTH_PX,
  type TreeNodeData,
} from "@/lib/graph-types";
import type { PipelineMode } from "@/lib/query-context";
import type { TreeLayoutOptions } from "@/lib/radial-tree-layout";
import { horizontalTreeLayout } from "@/lib/radial-tree-layout";
import {
  enrichNodesWithBranchColors,
  payloadToFlowEdges,
  payloadToFlowNodes,
} from "@/lib/tree-map";
import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

export const LAYOUT_OPTIONS: TreeLayoutOptions = {
  rootId: "root",
  spacingX: TREE_NODE_MAX_WIDTH_PX + TREE_NODE_COLUMN_GAP_PX,
  spacingY: 200,
  originX: 80,
  originY: 40,
};
const ROOT_SKELETON_COUNT = 3;

export type TreeDataStatus = "idle" | "loading" | "success" | "error";

export interface UseTreeDataResult {
  nodes: Node<TreeNodeData>[];
  edges: Edge[];
  status: TreeDataStatus;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches tree data from the API, maps to React Flow shape, and applies horizontal layout.
 * Server owns data; client owns fetch, mapping, and layout.
 * @param query — optional user search query (high-level topic) for knowledge research.
 * @param mode — pipeline mode: "research" (default) or "education" (Gemini-powered).
 */
export function useTreeData(
  query?: string,
  mode: PipelineMode = "research",
): UseTreeDataResult {
  const [nodes, setNodes] = useState<Node<TreeNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [status, setStatus] = useState<TreeDataStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);
    try {
      const applyData = (data: Awaited<ReturnType<typeof fetchTreeData>>) => {
        const flowNodes = payloadToFlowNodes(data.nodes);
        const flowEdges = payloadToFlowEdges(data.edges);
        const layoutedNodes = horizontalTreeLayout(
          flowNodes,
          flowEdges,
          LAYOUT_OPTIONS,
        );
        setNodes(enrichNodesWithBranchColors(layoutedNodes, flowEdges));
        setEdges(flowEdges);
        setStatus("success");
      };

      if (mode === "education" && query?.trim()) {
        const rootData = await streamEducationTreeData(
          query,
          applyData,
          controller.signal,
        );
        const rootNode = rootData.nodes.find((node) => node.id === "root");
        if (!rootNode) {
          throw new Error("Education API did not return a root node.");
        }
        const rootSummary = rootNode.data.summary ?? rootNode.data.description;
        const rootKeywords = Array.isArray(rootNode.data.keywords)
          ? rootNode.data.keywords.filter(
              (keyword): keyword is string =>
                typeof keyword === "string" && keyword.trim().length > 0,
            )
          : [];

        const initialSkeletonNodes = Array.from(
          { length: ROOT_SKELETON_COUNT },
          (_, index) => ({
            id: `root--skeleton-${index + 1}`,
            type: "treeNode",
            data: {
              label: "Generating...",
              level: 2,
              metadata: { parent: "root", skeleton: "true" },
            } as Awaited<
              ReturnType<typeof fetchTreeData>
            >["nodes"][number]["data"],
          }),
        );
        const initialSkeletonEdges = initialSkeletonNodes.map((node) => ({
          id: `root--${node.id}`,
          source: "root",
          target: node.id,
        }));
        applyData({
          query: rootData.query,
          nodes: [rootNode, ...initialSkeletonNodes],
          edges: initialSkeletonEdges,
        });

        const applyPartialRootExpansion = (
          data: Awaited<ReturnType<typeof streamEducationExpandSubtree>>,
        ) => {
          const remainingSkeletonCount = Math.max(
            0,
            ROOT_SKELETON_COUNT - data.nodes.length,
          );
          const skeletonNodes = initialSkeletonNodes.slice(
            0,
            remainingSkeletonCount,
          );
          const skeletonEdges = initialSkeletonEdges.slice(
            0,
            remainingSkeletonCount,
          );
          applyData({
            query: rootData.query,
            nodes: [rootNode, ...data.nodes, ...skeletonNodes],
            edges: [...data.edges, ...skeletonEdges],
          });
        };

        const finalExpansion = await streamEducationExpandSubtree(
          "root",
          applyPartialRootExpansion,
          query,
          {
            nodeLabel: rootNode.data.label,
            nodeSummary: rootSummary,
            keywords: rootKeywords,
            level: 1,
          },
          controller.signal,
        );

        applyData({
          query: rootData.query,
          nodes: [rootNode, ...finalExpansion.nodes],
          edges: finalExpansion.edges,
        });
      } else {
        const data = await fetchTreeData(query, mode, controller.signal);
        applyData(data);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus("error");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [query, mode]);

  useEffect(() => {
    if (!query) {
      abortRef.current?.abort();
      setStatus("idle");
      setNodes([]);
      setEdges([]);
      return;
    }
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load, query]);

  return { nodes, edges, status, error, refetch: load };
}
