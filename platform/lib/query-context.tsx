"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type PipelineMode = "research" | "education";

interface QueryContextValue {
  query: string | undefined;
  setQuery: (query: string | undefined) => void;
  pipelineMode: PipelineMode;
  setPipelineMode: (mode: PipelineMode) => void;
}

const QueryContext = createContext<QueryContextValue | null>(null);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState<string | undefined>(undefined);
  const [pipelineMode, setPipelineModeState] = useState<PipelineMode>("research");
  const setQuery = useCallback((q: string | undefined) => setQueryState(q), []);
  const setPipelineMode = useCallback((m: PipelineMode) => setPipelineModeState(m), []);
  return (
    <QueryContext.Provider value={{ query, setQuery, pipelineMode, setPipelineMode }}>
      {children}
    </QueryContext.Provider>
  );
}

export function useQuery() {
  const ctx = useContext(QueryContext);
  if (!ctx) throw new Error("useQuery must be used within QueryProvider");
  return ctx;
}
