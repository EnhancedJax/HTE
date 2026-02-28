"use client";

import { AnimatedGroup, AnimatedGroupProps } from "@/components/AnimatedGroup";
import { GraphTree } from "@/components/GraphTree";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr";
import "@xyflow/react/dist/style.css";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

const variants: AnimatedGroupProps["variants"] = {
  item: {
    hidden: { opacity: 0, filter: "blur(15px)", y: 20 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.2,
        duration: 1.5,
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.2 },
    },
  },
};

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
      className={`w-full flex flex-col bg-background overflow-auto ${hasQuery ? "flex-1 min-h-0" : "min-h-full"}`}
    >
      <motion.header
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`z-10 shrink-0 flex flex-col items-center justify-center ${
          hasQuery
            ? " w-full items-center justify-center px-4 py-3"
            : " min-h-screen w-full items-center justify-center"
        }`}
      >
        {!hasQuery && (
          <AnimatedGroup variants={variants}>
            <h1 className="text-2xl font-bold mb-2 text-center">
              Knowledge Tree Explorer
            </h1>
            <p className="text-sm text-muted-foreground mb-8 text-center">
              Explore the knowledge tree of a topic.
            </p>
          </AnimatedGroup>
        )}
        <motion.form
          layout
          onSubmit={handleSubmit}
          className={`relative flex w-full max-w-2xl items-center rounded-full px-1 py-1 ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 border border-input bg-card shadow-lg`}
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            type="submit"
            className="absolute right-2 top-1/2 flex -translate-y-1/2 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RocketLaunchIcon className="size-4" weight="bold" aria-hidden />
            Research
          </motion.button>
        </motion.form>
      </motion.header>
      <AnimatePresence mode="wait">
        {hasQuery && (
          <motion.div
            key="graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 min-h-0 mx-4 mb-4 rounded-3xl bg-card overflow-hidden flex flex-col"
          >
            <GraphTree query={query} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
