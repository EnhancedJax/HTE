"use client";

import {
  NODE_PALETTE,
  TREE_NODE_MAX_WIDTH_PX,
  TREE_NODE_SOURCE_HANDLE_ID,
  TREE_NODE_TARGET_HANDLE_ID,
  type TreeNodeData,
} from "@/lib/graph-types";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { renderSummaryWithHighlights } from "./NodeCard";

export type TreeNodeType = Node<TreeNodeData, "treeNode">;

const level1Styles = "bg-white text-black border-border shadow-lg scale-105";

/** Stagger delay (ms) per tree level so nodes fade in from center outward. */
const STAGGER_MS = 60;

/** Opacity for level-3 subnode background (transparent variant of branch color). */
const L3_BG_OPACITY = 0.2;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function TreeNode({ data, selected }: NodeProps<TreeNodeType>) {
  const level = Number(data?.level ?? 1);
  const metadata =
    data?.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : null;
  const isSkeleton = metadata?.skeleton === "true";
  const label = isSkeleton ? "Generating..." : (data?.label ?? "Node");
  const summary =
    !isSkeleton &&
    (typeof data?.summary === "string" || typeof data?.description === "string")
      ? ((data.summary ?? data.description) as string)
      : undefined;
  const branchIndex =
    typeof data?.branchIndex === "number" ? data.branchIndex : undefined;
  const delay = (level - 1) * STAGGER_MS;

  const color =
    branchIndex !== undefined && level !== 1
      ? NODE_PALETTE[branchIndex % NODE_PALETTE.length]
      : null;

  const isLevel2 = level === 2 && color;
  const isDeeperLevel = level >= 3 && color;

  const baseClass =
    "tree-node-in relative px-4 py-2.5 rounded-lg border-2 min-w-[100px] font-medium transition-all duration-200";
  const levelClass =
    level === 1
      ? level1Styles
      : isLevel2 || isDeeperLevel
        ? "border-current"
        : level === 2
          ? "bg-secondary text-secondary-foreground border-secondary"
          : "bg-muted text-muted-foreground border-muted";
  const selectedClass = selected
    ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
    : "";
  const skeletonClass = isSkeleton
    ? "skeleton-shimmer bg-muted/70 text-muted-foreground border-dashed border-muted-foreground/40"
    : "";

  const style: React.CSSProperties = {
    animationDelay: `${delay}ms`,
    maxWidth: `${TREE_NODE_MAX_WIDTH_PX}px`,
    ...(!isSkeleton &&
      isLevel2 && {
        backgroundColor: color,
        color: "#1a1a1a",
        borderColor: color,
      }),
    ...(!isSkeleton &&
      isDeeperLevel && {
        backgroundColor: hexToRgba(color, L3_BG_OPACITY),
        color: color,
        borderColor: color,
      }),
  };

  return (
    <div>
      <div
        className={`${baseClass} ${levelClass} ${selectedClass} ${skeletonClass}`}
        style={style}
      >
        <div className="text-left">
          <p className="text-base leading-snug wrap-break-word">{label}</p>
          {summary && (
            <p className="mt-1 text-xs leading-relaxed wrap-break-word opacity-90">
              {renderSummaryWithHighlights(summary, "underscore")}
            </p>
          )}
        </div>
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
