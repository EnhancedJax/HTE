import type { Node, Edge } from "@xyflow/react";
import type { TreeNode } from "./tree-data";

const LEVEL_GAP = 120;
const SIBLING_GAP = 100;
const CANVAS_WIDTH = 900;

export type TreeNodeData = Record<string, unknown> & {
  label: string;
  treeNode: TreeNode;
};

function collectLevels(root: TreeNode): TreeNode[][] {
  const levels: TreeNode[][] = [[root], [], []];
  (root.children ?? []).forEach((c) => {
    levels[1].push(c);
    (c.children ?? []).forEach((gc) => levels[2].push(gc));
  });
  return levels;
}

function buildNodesAndEdges(root: TreeNode): {
  nodes: Node<TreeNodeData>[];
  edges: Edge[];
} {
  const levels = collectLevels(root);
  const nodes: Node<TreeNodeData>[] = [];
  const edges: Edge[] = [];
  const centerX = CANVAS_WIDTH / 2;

  levels[0].forEach((n) => {
    nodes.push({
      id: n.id,
      type: "treeNode",
      position: { x: centerX, y: 80 },
      data: { label: n.label, treeNode: n },
    });
  });

  const w1 = (levels[1].length - 1) * SIBLING_GAP;
  levels[1].forEach((n, i) => {
    nodes.push({
      id: n.id,
      type: "treeNode",
      position: {
        x: centerX - w1 / 2 + i * SIBLING_GAP,
        y: 80 + LEVEL_GAP,
      },
      data: { label: n.label, treeNode: n },
    });
    edges.push({
      id: `e-${root.id}-${n.id}`,
      source: root.id,
      target: n.id,
      sourceHandle: "bottom",
      targetHandle: "top",
    });
  });

  levels[2].forEach((n) => {
    const parent = levels[1].find((p) =>
      (p.children ?? []).some((c) => c.id === n.id)
    );
    const parentNode = nodes.find((nd) => nd.id === parent?.id);
    const parentX = parentNode?.position.x ?? centerX;
    const siblings = parent ? parent.children ?? [] : [];
    const idx = siblings.findIndex((c) => c.id === n.id);
    const sibWidth = (siblings.length - 1) * SIBLING_GAP;
    const x = parentX - sibWidth / 2 + idx * SIBLING_GAP;
    nodes.push({
      id: n.id,
      type: "treeNode",
      position: { x, y: 80 + LEVEL_GAP * 2 },
      data: { label: n.label, treeNode: n },
    });
    if (parent) {
      edges.push({
        id: `e-${parent.id}-${n.id}`,
        source: parent.id,
        target: n.id,
        sourceHandle: "bottom",
        targetHandle: "top",
      });
    }
  });

  return { nodes, edges };
}

export function treeToFlow(root: TreeNode): {
  nodes: Node<TreeNodeData>[];
  edges: Edge[];
} {
  return buildNodesAndEdges(root);
}
