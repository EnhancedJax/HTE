import * as d3 from "d3-hierarchy";
import type { HierarchyNode } from "d3-hierarchy";
import type { Edge, Node } from "@xyflow/react";

interface TreeStub {
  id: string;
  children?: TreeStub[];
}

/**
 * Builds a tree structure from React Flow edges (parent -> children).
 * Assumes a single root; nodes not appearing as targets of edges are treated as roots.
 */
function buildTreeFromEdges(edges: Edge[], rootId: string): TreeStub {
  const childrenByParent = new Map<string, string[]>();

  for (const e of edges) {
    const list = childrenByParent.get(e.source) ?? [];
    list.push(e.target);
    childrenByParent.set(e.source, list);
  }

  if (!childrenByParent.has(rootId)) {
    throw new Error(
      `Root id "${rootId}" must appear as source of at least one edge.`,
    );
  }

  function makeStub(id: string): TreeStub {
    const childIds = childrenByParent.get(id) ?? [];
    return {
      id,
      children:
        childIds.length > 0 ? childIds.map(makeStub) : undefined,
    };
  }

  return makeStub(rootId);
}

/**
 * Applies a radial tree layout using d3-hierarchy.
 * Root is placed at center; children are arranged in a circle around it by depth.
 */
export function radialTreeLayout<N extends Record<string, unknown>>(
  nodes: Node<N>[],
  edges: Edge[],
  options: {
    rootId: string;
    centerX?: number;
    centerY?: number;
    radiusStep?: number;
    nodeWidth?: number;
    nodeHeight?: number;
  },
): Node<N>[] {
  const {
    rootId,
    centerX = 400,
    centerY = 350,
    radiusStep = 120,
    nodeWidth = 150,
    nodeHeight = 50,
  } = options;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const rootStub = buildTreeFromEdges(edges, rootId);
  const root = d3.hierarchy(rootStub, (d: TreeStub) => d.children ?? []);

  const treeLayout = d3
    .tree<TreeStub>()
    .size([2 * Math.PI, radiusStep])
    .separation(
      (a: HierarchyNode<TreeStub>, b: HierarchyNode<TreeStub>) =>
        (a.parent === b.parent ? 1 : 1.2) / (a.depth || 1),
    );

  treeLayout(root);

  const result: Node<N>[] = [];
  root.each((d: HierarchyNode<TreeStub>) => {
    const node = nodeMap.get(d.data.id);
    if (!node) return;
    const angle = d.x ?? 0;
    const radius = d.y ?? 0;
    result.push({
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle) - nodeWidth / 2,
        y: centerY + radius * Math.sin(angle) - nodeHeight / 2,
      },
    });
  });

  return result;
}
