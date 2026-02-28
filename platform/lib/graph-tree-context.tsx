"use client";

import { useTreeData } from "@/hooks/useTreeData";
import type { TreeNodeData } from "@/lib/graph-types";
import { useQuery } from "@/lib/query-context";
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
  const { query } = useQuery();
  const {
    nodes: fetchedNodes,
    edges: fetchedEdges,
    status,
    error,
    refetch,
  } = useTreeData(query);

  const [nodes, setNodes] = useState<Node<TreeNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node<TreeNodeData> | null>(null);

  // Sync fetched data into graph state so sidebar and flow see initial load
  useEffect(() => {
    if (status === "success") {
      setNodes(fetchedNodes);
      setEdges(fetchedEdges);
    } else if (!query) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
    }
  }, [status, fetchedNodes, fetchedEdges, query]);

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
  };

  return (
    <GraphTreeContext.Provider value={value}>{children}</GraphTreeContext.Provider>
  );
}
