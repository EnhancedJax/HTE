"use client";

import { GraphTree } from "@/components/GraphTree";
import "@xyflow/react/dist/style.css";
import { useState, useCallback } from "react";

export default function Page() {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState<string | undefined>(undefined);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = inputValue.trim();
      setQuery(q || undefined);
    },
    [inputValue],
  );

  return (
    <main className="h-screen w-screen flex flex-col">
      <header className="shrink-0 border-b border-border bg-card px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-2xl">
          <label htmlFor="knowledge-query" className="sr-only">
            Search topic
          </label>
          <input
            id="knowledge-query"
            type="search"
            placeholder="Search a topic (e.g. Climate Change, Quantum Computing)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Research
          </button>
        </form>
      </header>
      <div className="flex-1 min-h-0">
        <GraphTree query={query} />
      </div>
    </main>
  );
}
