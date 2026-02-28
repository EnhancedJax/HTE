"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface QueryContextValue {
  query: string | undefined;
  setQuery: (query: string | undefined) => void;
}

const QueryContext = createContext<QueryContextValue | null>(null);

export function QueryProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState<string | undefined>(undefined);
  const setQuery = useCallback((q: string | undefined) => setQueryState(q), []);
  return (
    <QueryContext.Provider value={{ query, setQuery }}>
      {children}
    </QueryContext.Provider>
  );
}

export function useQuery() {
  const ctx = useContext(QueryContext);
  if (!ctx) throw new Error("useQuery must be used within QueryProvider");
  return ctx;
}
