"use client";

import { useTreeData } from "@/hooks/useTreeData";
import type { TreeNodeData } from "@/lib/graph-types";
import { useQuery } from "@/lib/query-context";
import type { PipelineMode } from "@/lib/query-context";
import { nodesEdgesToTree } from "@/lib/tree-structure";
import type { TreeItem } from "@/lib/tree-structure";
import type { Edge, Node } from "@xyflow/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface GraphTreeContextValue {
  nodes: Node<TreeNodeData>[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node<TreeNodeData>[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  status: "idle" | "loading" | "success" | "error";
  error: Error | null;
  refetch: () => void;
  /** Tree built from current nodes/edges for sidebar. Updates when nodes/edges change (including after dive deep). */
  treeRoot: TreeItem | null;
  focusNodeId: string | null;
  setFocusNodeId: (id: string | null) => void;
  /** The node the user has currently selected/focused on the graph canvas. */
  selectedNode: Node<TreeNodeData> | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<Node<TreeNodeData> | null>>;
  /** IDs of all currently selected nodes (supports multi-select on graph). */
  selectedNodeIds: string[];
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  /** Materialized selected nodes from current graph state. */
  selectedNodes: Node<TreeNodeData>[];
  /** Current pipeline mode for expand calls. */
  pipelineMode: PipelineMode;
}

const GraphTreeContext = createContext<GraphTreeContextValue | null>(null);

export function useGraphTreeContext(): GraphTreeContextValue {
  const ctx = useContext(GraphTreeContext);
  if (!ctx) {
    throw new Error("useGraphTreeContext must be used within GraphTreeProvider");
  }
  return ctx;
}

export function useGraphTreeContextOptional(): GraphTreeContextValue | null {
  return useContext(GraphTreeContext);
}

interface GraphTreeProviderProps {
  children: ReactNode;
}

/**
 * Provides shared graph state (nodes, edges) and focus so the sidebar tree
 * stays in sync when the user "dives deeper" and clicking a sidebar row
 * can focus the corresponding node in the React Flow graph.
 */
export function GraphTreeProvider({ children }: GraphTreeProviderProps) {
  const { query, pipelineMode } = useQuery();
  const {
    nodes: fetchedNodes,
    edges: fetchedEdges,
    status,
    error,
    refetch,
  } = useTreeData(query, pipelineMode);

  const [nodes, setNodes] = useState<Node<TreeNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<TreeNodeData> | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  useEffect(() => {
    if (status === "success") {
      setNodes(fetchedNodes);
      setEdges(fetchedEdges);
    } else if (!query) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedNodeIds([]);
    }
  }, [status, fetchedNodes, fetchedEdges, query]);

  useEffect(() => {
    const nodeIds = new Set(nodes.map((node) => node.id));

    setSelectedNodeIds((current) =>
      current.filter((nodeId) => nodeIds.has(nodeId)),
    );

    setSelectedNode((current) => {
      if (!current) return null;
      return nodes.find((node) => node.id === current.id) ?? null;
    });
  }, [nodes]);

  const selectedNodes = selectedNodeIds
    .map((nodeId) => nodes.find((node) => node.id === nodeId))
    .filter((node): node is Node<TreeNodeData> => Boolean(node));

  const treeRoot = nodes.length > 0 ? nodesEdgesToTree(nodes, edges) : null;

  const value: GraphTreeContextValue = {
    nodes,
    edges,
    setNodes,
    setEdges,
    status,
    error,
    refetch,
    treeRoot,
    focusNodeId,
    setFocusNodeId,
    selectedNode,
    setSelectedNode,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedNodes,
    pipelineMode,
  };

  return (
    <GraphTreeContext.Provider value={value}>{children}</GraphTreeContext.Provider>
  );
}
