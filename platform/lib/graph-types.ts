export type TreeLevel = 1 | 2 | 3;

export interface TreeNodeData extends Record<string, unknown> {
  label: string;
  level: TreeLevel;
  description?: string;
  metadata?: Record<string, string>;
}
