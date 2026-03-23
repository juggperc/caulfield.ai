"use client";

import { useSession } from "@/features/auth/session-context";
import { registerResearchGetter } from "@/features/research/research-chat-bridge";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadResearchSnippets, saveResearchSnippets } from "./research-storage";
import type { ResearchSnippet } from "./research-types";

type ResearchContextValue = {
  readonly snippets: ResearchSnippet[];
  readonly addSnippets: (next: ResearchSnippet[]) => void;
  readonly removeSnippet: (id: string) => void;
  readonly clearAll: () => void;
};

const ResearchContext = createContext<ResearchContextValue | null>(null);

export const ResearchProvider = ({ children }: { readonly children: ReactNode }) => {
  const { user } = useSession();
  const [snippets, setSnippets] = useState<ResearchSnippet[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    queueMicrotask(() => {
      try {
        setSnippets(loadResearchSnippets());
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    saveResearchSnippets(snippets);
  }, [snippets, hydrated, user?.id]);

  useEffect(() => {
    registerResearchGetter(() => snippets);
  }, [snippets]);

  const addSnippets = useCallback((next: ResearchSnippet[]) => {
    if (next.length === 0) return;
    setSnippets((prev) => {
      const seen = new Set(prev.map((s) => s.id));
      const merged = [...prev];
      for (const s of next) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          merged.push(s);
        }
      }
      return merged;
    });
  }, []);

  const removeSnippet = useCallback((id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSnippets([]);
  }, []);

  const value = useMemo(
    () => ({ snippets, addSnippets, removeSnippet, clearAll }),
    [snippets, addSnippets, removeSnippet, clearAll],
  );

  return (
    <ResearchContext.Provider value={value}>{children}</ResearchContext.Provider>
  );
};

export const useResearch = (): ResearchContextValue => {
  const ctx = useContext(ResearchContext);
  if (!ctx) {
    throw new Error("useResearch must be used within ResearchProvider");
  }
  return ctx;
};
