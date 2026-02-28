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

  function makeStub(id: string, ancestry: Set<string>): TreeStub {
    if (ancestry.has(id)) {
      // Break cycles from malformed edge sets.
      return { id };
    }
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(id);
    const childIds = Array.from(new Set(childrenByParent.get(id) ?? []));
    return {
      id,
      children:
        childIds.length > 0
          ? childIds.map((childId) => makeStub(childId, nextAncestry))
          : undefined,
    };
  }

  return makeStub(rootId, new Set<string>());
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
  const positionedIds = new Set<string>();
  root.each((d: HierarchyNode<TreeStub>) => {
    const node = nodeMap.get(d.data.id);
    if (!node) return;
    // Defensive dedupe: malformed edge sets can make a node appear under
    // multiple parents in the hierarchy traversal, which would duplicate
    // ReactFlow node ids and trigger React key collisions.
    if (positionedIds.has(node.id)) return;
    const layoutX = d.y ?? 0;
    const layoutY = d.x ?? 0;
    positionedIds.add(node.id);
    result.push({
      ...node,
      position: {
        x: originX + layoutX,
        y: originY + layoutY,
      },
    });
  });

  // Keep nodes that are not reachable from root visible instead of dropping them.
  const fallbackY = originY + spacingY;
  let disconnectedIndex = 0;
  for (const node of nodes) {
    if (positionedIds.has(node.id)) continue;
    const x = node.position?.x ?? originX + spacingX;
    const y = node.position?.y ?? fallbackY + disconnectedIndex * (spacingY / 2);
    disconnectedIndex += 1;
    result.push({
      ...node,
      position: { x, y },
    });
  }

  return result;
}
