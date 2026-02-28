"use client";

import {
  TREE_NODE_SOURCE_HANDLE_ID,
  TREE_NODE_TARGET_HANDLE_ID,
  type TreeNodeData,
} from "@/lib/graph-types";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type TreeNodeType = Node<TreeNodeData, "treeNode">;

const levelStyles: Record<1 | 2 | 3, string> = {
  1: "bg-primary text-primary-foreground border-primary shadow-lg scale-105",
  2: "bg-secondary text-secondary-foreground border-secondary",
  3: "bg-muted text-muted-foreground border-muted",
};

/** Stagger delay (ms) per tree level so nodes fade in from center outward. */
const STAGGER_MS = 60;

export function TreeNode({ data, selected }: NodeProps<TreeNodeType>) {
  const level = data?.level ?? 1;
  const label = data?.label ?? "Node";
  const delay = (level - 1) * STAGGER_MS;

  return (
    <div>
      <div
        className={`
        tree-node-in relative px-4 py-2.5 rounded-lg border-2 min-w-[100px] text-center font-medium
        transition-all duration-200
        ${levelStyles[level]}
        ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}
      `}
        style={{ animationDelay: `${delay}ms` }}
      >
        <span className="text-lg">{label}</span>
      </div>
      <Handle
        type="target"
        // className="top-1/2! left-0! w-0! h-0! border-0! opacity-0! pointer-events-none!"
        position={Position.Left}
        id={TREE_NODE_TARGET_HANDLE_ID}
      />
      <Handle
        type="source"
        // className="top-1/2! left-0! w-0! h-0! border-0! opacity-0! pointer-events-none!"
        position={Position.Right}
        id={TREE_NODE_SOURCE_HANDLE_ID}
      />
    </div>
  );
}
