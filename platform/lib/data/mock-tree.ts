import type { TreeDataResponse } from "@/lib/schemas/tree";

/**
 * Server-side mock tree data.
 * Single source of truth for structure; layout is computed on the client.
 */
export function getMockTreeData(): TreeDataResponse {
  return {
    nodes: [
      {
        id: "root",
        type: "treeNode",
        data: {
          label: "Root",
          level: 1,
          description: "The root node of the hierarchy.",
          metadata: { type: "root", created: "2024-01-01" },
        },
      },
      {
        id: "l2-a",
        type: "treeNode",
        data: {
          label: "Branch A",
          level: 2,
          description: "First branch under root.",
          metadata: { owner: "Team Alpha" },
        },
      },
      {
        id: "l2-b",
        type: "treeNode",
        data: {
          label: "Branch B",
          level: 2,
          description: "Second branch under root.",
          metadata: { owner: "Team Beta" },
        },
      },
      {
        id: "l2-c",
        type: "treeNode",
        data: {
          label: "Branch C",
          level: 2,
          description: "Third branch under root.",
          metadata: { owner: "Team Gamma" },
        },
      },
      {
        id: "l3-a1",
        type: "treeNode",
        data: {
          label: "Leaf A1",
          level: 3,
          description: "Child of Branch A.",
          metadata: { status: "active" },
        },
      },
      {
        id: "l3-a2",
        type: "treeNode",
        data: {
          label: "Leaf A2",
          level: 3,
          description: "Child of Branch A.",
          metadata: { status: "draft" },
        },
      },
      {
        id: "l3-b1",
        type: "treeNode",
        data: {
          label: "Leaf B1",
          level: 3,
          description: "Child of Branch B.",
          metadata: { status: "active" },
        },
      },
      {
        id: "l3-b2",
        type: "treeNode",
        data: {
          label: "Leaf B2",
          level: 3,
          description: "Child of Branch B.",
          metadata: { status: "archived" },
        },
      },
      {
        id: "l3-c1",
        type: "treeNode",
        data: {
          label: "Leaf C1",
          level: 3,
          description: "Child of Branch C.",
          metadata: { status: "active" },
        },
      },
      {
        id: "l3-c2",
        type: "treeNode",
        data: {
          label: "Leaf C2",
          level: 3,
          description: "Child of Branch C.",
          metadata: { status: "pending" },
        },
      },
    ],
    edges: [
      { id: "e-root-l2a", source: "root", target: "l2-a" },
      { id: "e-root-l2b", source: "root", target: "l2-b" },
      { id: "e-root-l2c", source: "root", target: "l2-c" },
      { id: "e-l2a-l3a1", source: "l2-a", target: "l3-a1" },
      { id: "e-l2a-l3a2", source: "l2-a", target: "l3-a2" },
      { id: "e-l2b-l3b1", source: "l2-b", target: "l3-b1" },
      { id: "e-l2b-l3b2", source: "l2-b", target: "l3-b2" },
      { id: "e-l2c-l3c1", source: "l2-c", target: "l3-c1" },
      { id: "e-l2c-l3c2", source: "l2-c", target: "l3-c2" },
    ],
  };
}
