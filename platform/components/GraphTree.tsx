"use client";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useCallback, useState } from "react";

import type { TreeNodeData } from "@/lib/graph-types";
import { initialTreeEdges, initialTreeNodes } from "@/lib/mock-tree-data";
import { NodeCard } from "./NodeCard";
import { TreeNode } from "./TreeNode";

const nodeTypes = { treeNode: TreeNode };

function GraphTreeInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialTreeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialTreeEdges);
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

export function GraphTree() {
  return (
    <ReactFlowProvider>
      <GraphTreeInner />
    </ReactFlowProvider>
  );
}
