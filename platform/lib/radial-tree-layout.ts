import type { Edge, Node } from "@xyflow/react";
import type { HierarchyNode } from "d3-hierarchy";
import * as d3 from "d3-hierarchy";

export interface TreeLayoutOptions {
  rootId: string;
  /** Horizontal spacing between levels. */
  spacingX?: number;
  /** Vertical spacing between siblings. */
  spacingY?: number;
  /** Origin offset. */
  originX?: number;
  originY?: number;
}

interface TreeStub {
  id: string;
  children?: TreeStub[];
}

/**
 * Builds a tree structure from React Flow edges (parent -> children).
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
      children: childIds.length > 0 ? childIds.map(makeStub) : undefined,
    };
  }

  return makeStub(rootId);
}

/**
 * Applies a horizontal tree layout using d3-hierarchy.
 * Root on the left; children to the right. Edges run parent right → child left.
 */
export function horizontalTreeLayout<N extends Record<string, unknown>>(
  nodes: Node<N>[],
  edges: Edge[],
  options: TreeLayoutOptions,
): Node<N>[] {
  const {
    rootId,
    spacingX = 200,
    spacingY = 80,
    originX = 80,
    originY = 40,
  } = options;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const rootStub = buildTreeFromEdges(edges, rootId);
  const root = d3.hierarchy(rootStub, (d: TreeStub) => d.children ?? []);

  const treeLayout = d3
    .tree<TreeStub>()
    .nodeSize([spacingY, spacingX])
    .separation((a: HierarchyNode<TreeStub>, b: HierarchyNode<TreeStub>) =>
      a.parent === b.parent ? 1 : 1.1,
    );

  treeLayout(root);

  const result: Node<N>[] = [];
  root.each((d: HierarchyNode<TreeStub>) => {
    const node = nodeMap.get(d.data.id);
    if (!node) return;
    const layoutX = d.y ?? 0;
    const layoutY = d.x ?? 0;
    result.push({
      ...node,
      position: {
        x: originX + layoutX,
        y: originY + layoutY,
      },
    });
  });

  return result;
}
