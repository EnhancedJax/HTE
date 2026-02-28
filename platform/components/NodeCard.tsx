"use client";

import type { TreeNodeData } from "@/lib/graph-types";

interface NodeCardProps {
  nodeId: string;
  data: TreeNodeData;
  onClose: () => void;
}

export function NodeCard({ nodeId, data, onClose }: NodeCardProps) {
  return (
    <div className="h-full flex flex-col bg-card text-card-foreground border-l border-border shadow-xl">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold">Node details</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4 flex-1 overflow-auto space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</p>
          <p className="mt-1 font-mono text-sm break-all">{nodeId}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Label</p>
          <p className="mt-1 font-medium">{data.label}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Level</p>
          <p className="mt-1">Level {data.level}</p>
        </div>
        {data.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
            <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>
          </div>
        )}
        {data.metadata && Object.keys(data.metadata).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metadata</p>
            <dl className="mt-1 space-y-1">
              {Object.entries(data.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <dt className="text-muted-foreground">{key}:</dt>
                  <dd className="font-mono">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
