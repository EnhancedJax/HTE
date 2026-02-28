"use client";

import type { TreeNodeData } from "@/lib/graph-types";

interface NodeCardProps {
  nodeId: string;
  data: TreeNodeData;
  onClose: () => void;
  /** True when this node has no children in the current tree (leaf). */
  isLeaf?: boolean;
  /** Called when user clicks "Dive deep" to generate a subtree. Only shown when isLeaf is true. */
  onDiveDeep?: () => void | Promise<void>;
  /** True while a dive-deep request is in progress. */
  diveDeepLoading?: boolean;
}

export function NodeCard({
  nodeId,
  data,
  onClose,
  isLeaf,
  onDiveDeep,
  diveDeepLoading,
}: NodeCardProps) {
  const summary = data.summary ?? data.description;
  const images = data.images ?? [];
  const relatedLinks = data.relatedLinks ?? [];

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground border-l border-border rounded-xl shadow-xl">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold truncate pr-2">{data.label}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      {isLeaf && onDiveDeep && (
        <div className="px-4 pt-3 shrink-0">
          <button
            type="button"
            onClick={onDiveDeep}
            disabled={diveDeepLoading}
            className="w-full rounded-lg border-2 border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {diveDeepLoading ? "Generating…" : "Dive deep"}
          </button>
        </div>
      )}
      <div className="p-4 flex-1 overflow-auto space-y-4">
        {summary && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Summary
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {summary}
            </p>
          </div>
        )}
        {images.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Images
            </p>
            <div className="flex flex-col gap-2">
              {images.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Topic image ${i + 1}`}
                    className="w-full h-32 object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}
        {relatedLinks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Related links
            </p>
            <ul className="space-y-1.5">
              {relatedLinks.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {link.title || link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
