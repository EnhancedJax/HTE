export interface TreeNode {
  id: string;
  label: string;
  description?: string;
  metadata?: Record<string, string>;
  children?: TreeNode[];
}

export const MOCK_TREE: TreeNode = {
  id: "root",
  label: "Root",
  description: "The root node of the hierarchy. All other nodes branch from here.",
  metadata: { type: "root", created: "2024-01-01" },
  children: [
    {
      id: "branch-a",
      label: "Branch A",
      description: "First major branch. Handles primary workflows.",
      metadata: { type: "branch", owner: "Team Alpha" },
      children: [
        {
          id: "leaf-a1",
          label: "Leaf A1",
          description: "Endpoint for workflow A1.",
          metadata: { status: "active", version: "2.1" },
        },
        {
          id: "leaf-a2",
          label: "Leaf A2",
          description: "Endpoint for workflow A2.",
          metadata: { status: "active", version: "1.4" },
        },
        {
          id: "leaf-a3",
          label: "Leaf A3",
          description: "Endpoint for workflow A3.",
          metadata: { status: "draft", version: "0.9" },
        },
      ],
    },
    {
      id: "branch-b",
      label: "Branch B",
      description: "Second major branch. Handles secondary workflows.",
      metadata: { type: "branch", owner: "Team Beta" },
      children: [
        {
          id: "leaf-b1",
          label: "Leaf B1",
          description: "Endpoint for workflow B1.",
          metadata: { status: "active", version: "3.0" },
        },
        {
          id: "leaf-b2",
          label: "Leaf B2",
          description: "Endpoint for workflow B2.",
          metadata: { status: "archived", version: "2.0" },
        },
      ],
    },
    {
      id: "branch-c",
      label: "Branch C",
      description: "Third major branch. Experimental features.",
      metadata: { type: "branch", owner: "Team Gamma" },
      children: [
        {
          id: "leaf-c1",
          label: "Leaf C1",
          description: "Experimental endpoint C1.",
          metadata: { status: "experimental", version: "0.1" },
        },
      ],
    },
  ],
};

export function getNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = getNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function getLevel(node: TreeNode, root: TreeNode, level = 0): number {
  if (root.id === node.id) return level;
  for (const child of root.children ?? []) {
    const l = getLevel(node, child, level + 1);
    if (l >= 0) return l;
  }
  return -1;
}
