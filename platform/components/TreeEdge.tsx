"use client";

import { getSimpleBezierPath, type EdgeProps } from "@xyflow/react";
import { memo } from "react";

/** Fixed pixel dash/gap so all edges share the same segment length regardless of path length. */
const DASH_PX = 6;
const GAP_PX = 12;
const PHASE_PX = DASH_PX + GAP_PX;

export function TreeEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const [edgePath] = getSimpleBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      {/* <BaseEdge id={id} path={edgePath} style={{ stroke: "var(--border)" }} /> */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        strokeLinecap="round"
        strokeDasharray={`${DASH_PX} ${GAP_PX}`}
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to={String(-PHASE_PX)}
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>
    </>
  );
}

export const TreeEdge = memo(TreeEdgeComponent);
