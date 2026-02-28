"use client";

import type { TreeNodeData } from "@/lib/graph-types";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export type TreeNodeType = Node<TreeNodeData, "treeNode">;

const levelStyles: Record<1 | 2 | 3, string> = {
  1: "bg-primary text-primary-foreground border-primary shadow-lg scale-105",
  2: "bg-secondary text-secondary-foreground border-secondary",
  3: "bg-muted text-muted-foreground border-muted",
};

export function TreeNode({ data, selected }: NodeProps<TreeNodeType>) {
  const level = data?.level ?? 1;
  const label = data?.label ?? "Node";

  return (
    <div
      className={`
        px-4 py-2.5 rounded-lg border-2 min-w-[100px] text-center font-medium
        transition-all duration-200
        ${levelStyles[level]}
        ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2! h-2! bg-gray-500!"
      />
      <span className="text-sm">{label}</span>
      <span className="ml-1.5 text-xs opacity-80">L{level}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2! h-2! bg-gray-500!"
      />
    </div>
  );
}
