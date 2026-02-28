"use client";

import { memo } from "react";
import {
  BaseEdge,
  getStraightPath,
  useStore,
  type EdgeProps,
} from "@xyflow/react";

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 50;

function getNodeCenter(
  position: { x: number; y: number },
  measured: { width?: number; height?: number } | undefined,
  width?: number,
  height?: number,
) {
  const w = measured?.width ?? width ?? DEFAULT_NODE_WIDTH;
  const h = measured?.height ?? height ?? DEFAULT_NODE_HEIGHT;
  return {
    x: position.x + w / 2,
    y: position.y + h / 2,
  };
}

function CenterToCenterEdgeComponent({
  id,
  source,
  target,
}: EdgeProps) {
  const nodes = useStore((state) => state.nodes);

  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceCenter = getNodeCenter(
    sourceNode.position,
    (sourceNode as { measured?: { width?: number; height?: number } }).measured,
    (sourceNode as { width?: number }).width,
    (sourceNode as { height?: number }).height,
  );
  const targetCenter = getNodeCenter(
    targetNode.position,
    (targetNode as { measured?: { width?: number; height?: number } }).measured,
    (targetNode as { width?: number }).width,
    (targetNode as { height?: number }).height,
  );

  const [path] = getStraightPath({
    sourceX: sourceCenter.x,
    sourceY: sourceCenter.y,
    targetX: targetCenter.x,
    targetY: targetCenter.y,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{ stroke: "var(--border)" }}
    />
  );
}

export const CenterToCenterEdge = memo(CenterToCenterEdgeComponent);
