"use client";

import { fetchTreeData, streamEducationTreeData } from "@/lib/api/tree";
import type { TreeNodeData } from "@/lib/graph-types";
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
  spacingX: 300,
  spacingY: 120,
  originX: 80,
  originY: 40,
};
const ROOT_SKELETON_COUNT = 4;

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
export function useTreeData(query?: string, mode: PipelineMode = "research"): UseTreeDataResult {
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
        const initialSkeletonNodes = Array.from(
          { length: ROOT_SKELETON_COUNT },
          (_, index) => ({
            id: `root--skeleton-${index + 1}`,
            type: "treeNode",
            data: {
              label: "Generating...",
              level: 2,
              metadata: { parent: "root", skeleton: "true" },
            } as Awaited<ReturnType<typeof fetchTreeData>>["nodes"][number]["data"],
          }),
        );
        applyData({
          query,
          nodes: [
            {
              id: "root",
              type: "treeNode",
              data: { label: query, level: 1, metadata: { type: "root" } },
            },
            ...initialSkeletonNodes,
          ],
          edges: initialSkeletonNodes.map((node) => ({
            id: `root--${node.id}`,
            source: "root",
            target: node.id,
          })),
        });

        const applyPartialWithSkeletons = (
          data: Awaited<ReturnType<typeof fetchTreeData>>,
        ) => {
          const childTargets = Array.from(
            new Set(
              data.edges
                .filter((edge) => edge.source === "root")
                .map((edge) => edge.target),
            ),
          );
          const loadedChildren = data.nodes.filter(
            (node) => node.id !== "root" && childTargets.includes(node.id),
          );
          const remainingSkeletonCount = Math.max(
            0,
            ROOT_SKELETON_COUNT - loadedChildren.length,
          );

          const skeletonNodes = Array.from(
            { length: remainingSkeletonCount },
            (_, index) => ({
              id: `root--skeleton-${index + 1}`,
              type: "treeNode",
              data: {
                label: "Generating...",
                level: 2,
                metadata: { parent: "root", skeleton: "true" },
              } as (typeof data.nodes)[number]["data"],
            }),
          );
          const skeletonEdges = skeletonNodes.map((node) => ({
            id: `root--${node.id}`,
            source: "root",
            target: node.id,
          }));

          applyData({
            query: data.query,
            nodes: [...data.nodes, ...skeletonNodes],
            edges: [...data.edges, ...skeletonEdges],
          });
        };

        const finalData = await streamEducationTreeData(
          query,
          applyPartialWithSkeletons,
          controller.signal,
        );
        applyData(finalData);
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
