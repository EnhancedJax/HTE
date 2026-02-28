"use client";

import {
  type TreeNodeData,
  TREE_NODE_DRAG_HANDLE_CLASS,
  TREE_NODE_SOURCE_HANDLE_ID,
  TREE_NODE_TARGET_HANDLE_ID,
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
        tree-node-in relative flex min-w-[100px] items-stretch rounded-lg border-2
        transition-all duration-200
        ${levelStyles[level]}
        ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Target (incoming) drag handle – edges attach here */}
      <div
        className={`${TREE_NODE_DRAG_HANDLE_CLASS} flex w-5 shrink-0 items-center justify-center rounded-l-md border-r border-inherit/30`}
        title="Drag or connect"
      >
        <Handle
          type="target"
          position={Position.Left}
          id={TREE_NODE_TARGET_HANDLE_ID}
        />
      </div>
      <div className="nodrag flex flex-1 items-center justify-center px-3 py-2.5 font-medium">
        <span className="text-lg">{label}</span>
      </div>
      {/* Source (outgoing) drag handle – edges originate here */}
      <div
        className={`${TREE_NODE_DRAG_HANDLE_CLASS} flex w-5 shrink-0 items-center justify-center rounded-r-md border-l border-inherit/30`}
        title="Drag or connect"
      >
        <Handle
          type="source"
          position={Position.Right}
          id={TREE_NODE_SOURCE_HANDLE_ID}
        />
      </div>
    </div>
  );
}
