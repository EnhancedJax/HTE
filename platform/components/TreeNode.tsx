"use client";

import {
  TREE_NODE_CENTER_HANDLE_ID,
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
    <div
      className={`
        tree-node-in relative px-4 py-2.5 rounded-lg border-2 min-w-[100px] text-center font-medium
        transition-all duration-200
        ${levelStyles[level]}
        ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Handle
        type="target"
        id={TREE_NODE_CENTER_HANDLE_ID}
        position={Position.Top}
        className="left-1/2! top-1/2! -translate-x-1/2! -translate-y-1/2! w-0! h-0! min-w-0! min-h-0! border-0! opacity-0! pointer-events-none!"
      />
      <Handle
        type="source"
        id={TREE_NODE_CENTER_HANDLE_ID}
        position={Position.Bottom}
        className="left-1/2! top-1/2! -translate-x-1/2! -translate-y-1/2! w-0! h-0! min-w-0! min-h-0! border-0! opacity-0! pointer-events-none!"
      />
      <span className="text-sm">{label}</span>
      <span className="ml-1.5 text-xs opacity-80">L{level}</span>
    </div>
  );
}
