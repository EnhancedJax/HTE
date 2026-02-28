"use client";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useCallback, useState } from "react";

import { LAYOUT_OPTIONS, useTreeData } from "@/hooks/useTreeData";
import { fetchExpandSubtree } from "@/lib/api/tree";
import type { TreeNodeData } from "@/lib/graph-types";
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

interface GraphTreeInnerProps {
  query?: string;
}

function GraphTreeInner({ query }: GraphTreeInnerProps) {
  const {
    nodes: fetchedNodes,
    edges: fetchedEdges,
    status,
    error,
    refetch,
  } = useTreeData(query);

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

  return (
    <GraphTreeFlow
      initialNodes={fetchedNodes}
      initialEdges={fetchedEdges}
      query={query}
    />
  );
}

interface GraphTreeFlowProps {
  initialNodes: Node<TreeNodeData>[];
  initialEdges: Edge[];
  query?: string;
}

function GraphTreeFlow({
  initialNodes,
  initialEdges,
  query,
}: GraphTreeFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<TreeNodeData> | null>(
    null,
  );
  const [diveDeepLoading, setDiveDeepLoading] = useState(false);
  const reactFlow = useReactFlow<Node<TreeNodeData>>();

  const isLeaf =
    selectedNode && !edges.some((e) => e.source === selectedNode.id);

  const onDiveDeep = useCallback(async () => {
    if (!selectedNode) return;
    setDiveDeepLoading(true);
    try {
      const data = await fetchExpandSubtree(selectedNode.id, query);
      const newFlowNodes = payloadToFlowNodes(data.nodes);
      const newFlowEdges = payloadToFlowEdges(data.edges);
      const mergedEdges = [...edges, ...newFlowEdges];

      setNodes((prev) => {
        const merged = horizontalTreeLayout(
          [...prev, ...newFlowNodes],
          mergedEdges,
          LAYOUT_OPTIONS,
        );
        return enrichNodesWithBranchColors(merged, mergedEdges);
      });
      setEdges(mergedEdges);
    } catch {
      // Could surface error in UI; for now no-op
    } finally {
      setDiveDeepLoading(false);
    }
  }, [selectedNode, query, edges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler<Node<TreeNodeData>> = useCallback(
    (_event, node) => {
      setSelectedNode(node);
      if (reactFlow.viewportInitialized) {
        reactFlow.fitView({
          nodes: [node],
          padding: 0.35,
          duration: 400,
        });
      }
    },
    [reactFlow],
  );

  const closeCard = useCallback(() => setSelectedNode(null), []);

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
