"use client";

import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

import { LAYOUT_OPTIONS } from "@/hooks/useTreeData";
import { fetchExpandSubtree, streamEducationExpandSubtree } from "@/lib/api/tree";
import { useGraphTreeContext } from "@/lib/graph-tree-context";
import {
  TREE_NODE_SOURCE_HANDLE_ID,
  TREE_NODE_TARGET_HANDLE_ID,
  type TreeNodeData,
} from "@/lib/graph-types";
import { horizontalTreeLayout } from "@/lib/radial-tree-layout";
import {
  enrichNodesWithBranchColors,
  payloadToFlowEdges,
  payloadToFlowNodes,
} from "@/lib/tree-map";
import { NodeCard } from "./NodeCard";
import { TreeEdge } from "./TreeEdge";
import { TreeLoading } from "./TreeLoading";
import { TreeNode } from "./TreeNode";

const nodeTypes = { treeNode: TreeNode };
const edgeTypes = { treeEdge: TreeEdge };
const DIVE_DEEP_SKELETON_COUNT = 4;

/** Right padding (px) for fitView when NodeCard is visible so the focused node stays clear of the card. */
const NODE_CARD_FIT_PADDING_RIGHT = 336; // w-80 (320px) + right-3 (12px) + buffer

interface GraphTreeInnerProps {
  query?: string;
}

function GraphTreeInner({ query }: GraphTreeInnerProps) {
  const { status, error, refetch } = useGraphTreeContext();

  if (status === "loading" || status === "idle") {
    return <TreeLoading />;
  }

  if (status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
        <p className="text-destructive">
          {error?.message ?? "Failed to load tree"}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return <GraphTreeFlow query={query} />;
}

interface GraphTreeFlowProps {
  query?: string;
}

function GraphTreeFlow({ query }: GraphTreeFlowProps) {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    focusNodeId,
    setFocusNodeId,
    selectedNode,
    setSelectedNode,
    pipelineMode,
  } = useGraphTreeContext();
  const [diveDeepLoading, setDiveDeepLoading] = useState(false);
  const reactFlow = useReactFlow<Node<TreeNodeData>>();

  const applyLayoutAndColors = useCallback(
    (nextNodes: Node<TreeNodeData>[], nextEdges: typeof edges) => {
      setEdges(nextEdges);
      const layouted = horizontalTreeLayout(
        nextNodes,
        nextEdges,
        LAYOUT_OPTIONS,
      );
      setNodes(enrichNodesWithBranchColors(layouted, nextEdges));
    },
    [setEdges, setNodes],
  );

  const isLeaf =
    selectedNode && !edges.some((e) => e.source === selectedNode.id);

  // When sidebar requests focus, fit view to that node and select it
  useEffect(() => {
    if (!focusNodeId) return;
    const node = nodes.find((n) => n.id === focusNodeId);
    if (!node) {
      return;
    }
    setSelectedNode(node);
    const focusView = () => {
      if (reactFlow.viewportInitialized) {
        const flowNodes = reactFlow.getNodes();
        const flowNode = flowNodes.find((n) => n.id === focusNodeId);
        if (flowNode) {
          reactFlow.fitView({
            nodes: [flowNode],
            padding: {
              right: `${NODE_CARD_FIT_PADDING_RIGHT * 2}px`,
            },
            duration: 400,
          });
        } else {
          // Node may not be in flow yet; pan to node position (approximate center of node)
          const cx = node.position.x + 120;
          const cy = node.position.y + 40;
          reactFlow.setCenter(cx, cy, { duration: 400 });
        }
      }
      setFocusNodeId(null);
    };
    // Defer so viewport and node list are ready after state updates (see React Flow fitView docs)
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(focusView);
    });
    return () => cancelAnimationFrame(rafId);
  }, [focusNodeId, nodes, reactFlow, setFocusNodeId, setSelectedNode]);

  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<TreeNodeData>[]),
    [setNodes],
  );
  const onEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const expandNode = useCallback(async (targetNode: Node<TreeNodeData>) => {
    const parentId = targetNode.id;
    const parentLevel = Number(targetNode.data?.level ?? 1);
    const childLevel = parentLevel + 1;
    const skeletonNodes: Node<TreeNodeData>[] = Array.from(
      { length: DIVE_DEEP_SKELETON_COUNT },
      (_, index) => ({
        id: `${parentId}--skeleton-${index + 1}`,
        type: "treeNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Generating...",
          level: childLevel,
          metadata: { parent: parentId, skeleton: "true" },
        } as TreeNodeData,
      }),
    );
    const skeletonEdges = skeletonNodes.map((node, index) => ({
      id: `e-${parentId}--skeleton-${index + 1}`,
      source: parentId,
      target: node.id,
      type: "treeEdge" as const,
      sourceHandle: TREE_NODE_SOURCE_HANDLE_ID,
      targetHandle: TREE_NODE_TARGET_HANDLE_ID,
    }));

    const nodesWithoutSkeleton = nodes.filter(
      (node) =>
        !(
          typeof node.data?.metadata === "object" &&
          node.data?.metadata &&
          (node.data.metadata as Record<string, unknown>).parent === parentId &&
          (node.data.metadata as Record<string, unknown>).skeleton === "true"
        ),
    );
    const edgesWithoutSkeleton = edges.filter(
      (edge) =>
        !(
          edge.source === parentId &&
          edge.target.includes(`${parentId}--skeleton-`)
        ),
    );

    applyLayoutAndColors(
      [...nodesWithoutSkeleton, ...skeletonNodes],
      [...edgesWithoutSkeleton, ...skeletonEdges],
    );
    // One-time zoom out on the first dive-deep interaction.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void reactFlow.fitView({
          padding: {
            right: `${NODE_CARD_FIT_PADDING_RIGHT * 2}px`,
          },
          duration: 350,
        });
      });
    });

    setDiveDeepLoading(true);
    try {
      const expandOptions = {
        nodeLabel: targetNode.data?.label,
        nodeSummary: targetNode.data?.summary ?? targetNode.data?.description,
        keywords: Array.isArray(targetNode.data?.keywords)
          ? targetNode.data.keywords.filter(
              (keyword): keyword is string =>
                typeof keyword === "string" && keyword.trim().length > 0,
            )
          : undefined,
        level: parentLevel,
      };

      const applyPartialExpansion = (data: Awaited<ReturnType<typeof fetchExpandSubtree>>) => {
        const newFlowNodes = payloadToFlowNodes(data.nodes);
        const newFlowEdges = payloadToFlowEdges(data.edges);
        const remainingSkeletonCount = Math.max(
          0,
          DIVE_DEEP_SKELETON_COUNT - newFlowNodes.length,
        );
        const remainingSkeletonNodes = skeletonNodes.slice(0, remainingSkeletonCount);
        const remainingSkeletonEdges = skeletonEdges.slice(0, remainingSkeletonCount);
        applyLayoutAndColors(
          [...nodesWithoutSkeleton, ...newFlowNodes, ...remainingSkeletonNodes],
          [...edgesWithoutSkeleton, ...newFlowEdges, ...remainingSkeletonEdges],
        );
      };

      if (pipelineMode === "education") {
        const finalData = await streamEducationExpandSubtree(
          parentId,
          applyPartialExpansion,
          query,
          expandOptions,
        );
        const finalNodes = payloadToFlowNodes(finalData.nodes);
        const finalEdges = payloadToFlowEdges(finalData.edges);
        applyLayoutAndColors(
          [...nodesWithoutSkeleton, ...finalNodes],
          [...edgesWithoutSkeleton, ...finalEdges],
        );
        if (finalNodes.length > 0) {
          setFocusNodeId(finalNodes[0].id);
        }
      } else {
        const data = await fetchExpandSubtree(parentId, query, pipelineMode, expandOptions);
        const newFlowNodes = payloadToFlowNodes(data.nodes);
        const newFlowEdges = payloadToFlowEdges(data.edges);

        applyLayoutAndColors(
          [...nodesWithoutSkeleton, ...newFlowNodes],
          [...edgesWithoutSkeleton, ...newFlowEdges],
        );
        if (newFlowNodes.length > 0) {
          setFocusNodeId(newFlowNodes[0].id);
        }
      }
    } catch {
      // Revert temporary skeleton children when expansion fails.
      applyLayoutAndColors(nodesWithoutSkeleton, edgesWithoutSkeleton);
    } finally {
      setDiveDeepLoading(false);
    }
  }, [
    query,
    nodes,
    edges,
    applyLayoutAndColors,
    setFocusNodeId,
    reactFlow,
    pipelineMode,
  ]);

  const onDiveDeep = useCallback(async () => {
    if (!selectedNode) return;
    await expandNode(selectedNode);
  }, [selectedNode, expandNode]);

  const onNodeClick: NodeMouseHandler<Node<TreeNodeData>> = useCallback(
    async (_event, node) => {
      const shouldAutoDiveDeep =
        pipelineMode === "education" &&
        Number(node.data?.level ?? 1) >= 2 &&
        !edges.some((edge) => edge.source === node.id) &&
        !diveDeepLoading;

      if (shouldAutoDiveDeep) {
        await expandNode(node);
      }

      setSelectedNode(node);
      if (reactFlow.viewportInitialized) {
        reactFlow.fitView({
          nodes: [node],
          padding: {
            right: `${NODE_CARD_FIT_PADDING_RIGHT * 2}px`,
          },
          duration: 400,
        });
      }
    },
    [
      pipelineMode,
      edges,
      diveDeepLoading,
      expandNode,
      reactFlow,
      setSelectedNode,
    ],
  );

  const closeCard = useCallback(() => setSelectedNode(null), [setSelectedNode]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "treeEdge" }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          className="bg-transparent!"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="var(--muted-foreground)"
          />
        </ReactFlow>
      </div>
      {selectedNode && selectedNode.data && (
        <aside className="absolute top-3 bottom-3 right-3 z-10 w-80 flex flex-col">
          <NodeCard
            nodeId={selectedNode.id}
            data={selectedNode.data as TreeNodeData}
            onClose={closeCard}
            isLeaf={!!isLeaf}
            onDiveDeep={isLeaf ? onDiveDeep : undefined}
            diveDeepLoading={diveDeepLoading}
          />
        </aside>
      )}
    </div>
  );
}

interface GraphTreeProps {
  /** User's search query (high-level topic). Omit for default topic. */
  query?: string;
}

export function GraphTree({ query }: GraphTreeProps) {
  return (
    <ReactFlowProvider>
      <GraphTreeInner query={query} />
    </ReactFlowProvider>
  );
}
