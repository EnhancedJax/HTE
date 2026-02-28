"use client";

import { AnimatedGroup, AnimatedGroupProps } from "@/components/AnimatedGroup";
import { GraphTree } from "@/components/GraphTree";
import { AnimatedShinyButton } from "@/components/ui/animated-shiny-button";
import Novatrix from "@/components/ui/novatrix-background";
import { useQuery, type PipelineMode } from "@/lib/query-context";
import {
  ArrowCounterClockwiseIcon,
  BookOpenTextIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
} from "@phosphor-icons/react";
import { LinuxLogoIcon } from "@phosphor-icons/react/dist/ssr";
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

const MODES: {
  value: PipelineMode;
  label: string;
  icon: typeof MagnifyingGlassIcon;
}[] = [
  { value: "research", label: "Research", icon: MagnifyingGlassIcon },
  { value: "education", label: "Explore", icon: BookOpenTextIcon },
];

export default function Page() {
  const [inputValue, setInputValue] = useState("");
  const { query, setQuery, pipelineMode, setPipelineMode } = useQuery();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = inputValue.trim();
      setQuery(q || undefined);
    },
    [inputValue, setQuery],
  );

  const hasQuery = query !== undefined && query !== "";

  return (
    <main
      className={`w-full flex flex-col bg-background overflow-hidden ${hasQuery ? "flex-1 min-h-0" : "min-h-full"}`}
    >
      {!hasQuery && (
        <div className="absolute inset-0 top-0 left-0 right-0 bottom-0">
          <Novatrix
            color={[0.15, 0.15, 0.15]}
            amplitude={0.1}
            mouseReact={true}
            speed={1.0}
          />
        </div>
      )}
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
            <div className="relative flex flex-col items-center">
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-6 z-0 opacity-80"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 20%, transparent 65%)",
                  maskImage:
                    "linear-gradient(to bottom, black 20%, transparent 65%)",
                }}
              >
                {/* Faded out icon, choose something tree/knowledge themed if using your own icon library */}
                <LinuxLogoIcon className="w-28 h-28 text-foreground" />
              </span>
              <h1 className="text-3xl font-bold mb-2 text-center relative z-10">
                Knowledge Tree Explorer
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mb-10 text-center">
              Dive deeper, learn more.
            </p>
          </AnimatedGroup>
        )}

        <motion.div
          layout
          className="flex flex-col items-center gap-2 w-full max-w-2xl"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Pipeline mode toggle */}
          <motion.div
            layout
            className="inline-flex items-center rounded-full bg-muted p-0.5 border border-border"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {MODES.map((m) => {
              const Icon = m.icon;
              const isActive = pipelineMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    if (!hasQuery) setPipelineMode(m.value);
                  }}
                  disabled={hasQuery}
                  className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  } ${hasQuery ? "cursor-default opacity-70" : "cursor-pointer"}`}
                >
                  <Icon
                    className="size-3.5"
                    weight={isActive ? "bold" : "regular"}
                    aria-hidden
                  />
                  {m.label}
                </button>
              );
            })}
          </motion.div>

          {/* Search bar */}
          <motion.form
            layout
            onSubmit={handleSubmit}
            className="relative flex w-full items-center rounded-full px-1 py-1 ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 border border-input bg-card shadow-lg"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <label htmlFor="knowledge-query" className="sr-only">
              Search topic
            </label>
            <input
              id="knowledge-query"
              type="search"
              placeholder={
                pipelineMode === "education"
                  ? "Learn a topic (e.g. Quantum Computing, Neural Networks)"
                  : "Search a topic (e.g. Climate Change, Quantum Computing)"
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-w-0 rounded-full bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
            />
            {hasQuery ? (
              <AnimatedShinyButton
                variant="default"
                type="button"
                onClick={() => {
                  setQuery(undefined);
                  setInputValue("");
                }}
              >
                <div className="flex items-center gap-2">
                  <ArrowCounterClockwiseIcon
                    className="size-4"
                    weight="bold"
                    aria-hidden
                  />
                  Reset
                </div>
              </AnimatedShinyButton>
            ) : (
              <AnimatedShinyButton type="submit">
                <div className="flex items-center gap-2">
                  <RocketLaunchIcon
                    className="size-4"
                    weight="bold"
                    aria-hidden
                  />
                  {pipelineMode === "education" ? "Explore" : "Research"}
                </div>
              </AnimatedShinyButton>
            )}
          </motion.form>
        </motion.div>
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
