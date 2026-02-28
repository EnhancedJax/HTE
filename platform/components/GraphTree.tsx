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

import type { TreeNodeData } from "@/lib/graph-types";
import { useTreeData } from "@/hooks/useTreeData";
import { CenterToCenterEdge } from "./CenterToCenterEdge";
import { NodeCard } from "./NodeCard";
import { TreeNode } from "./TreeNode";

const nodeTypes = { treeNode: TreeNode };
const edgeTypes = { centerToCenter: CenterToCenterEdge };

interface GraphTreeInnerProps {
  query?: string;
}

function GraphTreeInner({ query }: GraphTreeInnerProps) {
  const { nodes: fetchedNodes, edges: fetchedEdges, status, error, refetch } =
    useTreeData(query);

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading tree…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted/30 p-4">
        <p className="text-destructive">{error?.message ?? "Failed to load tree"}</p>
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
    <GraphTreeFlow initialNodes={fetchedNodes} initialEdges={fetchedEdges} />
  );
}

interface GraphTreeFlowProps {
  initialNodes: Node<TreeNodeData>[];
  initialEdges: Edge[];
}

function GraphTreeFlow({ initialNodes, initialEdges }: GraphTreeFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<TreeNodeData> | null>(
    null,
  );
  const reactFlow = useReactFlow<Node<TreeNodeData>>();

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
    <div className="flex h-full w-full">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "centerToCenter" }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          className="bg-muted/30"
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
        <aside className="w-80 shrink-0 flex flex-col">
          <NodeCard
            nodeId={selectedNode.id}
            data={selectedNode.data as TreeNodeData}
            onClose={closeCard}
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
