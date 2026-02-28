"use client";

import { GraphTree } from "@/components/GraphTree";
import { ArrowRight } from "@phosphor-icons/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

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
      className={`w-screen flex flex-col ${hasQuery ? "h-screen" : "min-h-screen"}`}
    >
      <motion.header
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`z-10 ${
          hasQuery
            ? "shrink-0 flex w-full items-center justify-center px-4 py-3"
            : "flex min-h-screen w-full items-center justify-center"
        }`}
      >
        <motion.form
          layout
          onSubmit={handleSubmit}
          className={`relative flex w-full max-w-2xl items-center rounded-full px-1 py-1 ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 border border-input bg-background shadow-lg`}
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
            className="flex-1 min-w-0 rounded-full bg-transparent px-4 py-2.5 pr-30 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 flex -translate-y-1/2 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowRight className="size-4" weight="bold" aria-hidden />
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
            className="flex-1 min-h-0 h-full fixed top-0 left-0 w-full"
          >
            <GraphTree query={query} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
