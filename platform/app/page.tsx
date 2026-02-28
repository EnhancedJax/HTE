"use client";

import { GraphTree } from "@/components/GraphTree";
import { motion, AnimatePresence } from "motion/react";
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

  const hasQuery = query !== undefined && query !== "";

  return (
    <main
      className={`w-screen flex flex-col ${hasQuery ? "h-screen" : "min-h-screen bg-white"}`}
    >
      <motion.header
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={
          hasQuery
            ? "shrink-0 border-b border-border bg-white px-4 py-3"
            : "flex min-h-screen w-full items-center justify-center bg-white"
        }
      >
        <motion.form
          layout
          onSubmit={handleSubmit}
          className="flex w-full max-w-2xl gap-2 items-center px-4"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
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
        </motion.form>
      </motion.header>
      <AnimatePresence mode="wait">
        {hasQuery && (
          <motion.div
            key="graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 h-full"
          >
            <GraphTree query={query} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
