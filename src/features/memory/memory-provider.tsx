"use client";

import { useSession } from "@/features/auth/session-context";
import { registerMemoryGetter } from "@/features/memory/memory-chat-bridge";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadMemoryEntries, saveMemoryEntries } from "./memory-storage";
import type { MemoryEntry } from "./memory-types";

type MemoryContextValue = {
  readonly entries: MemoryEntry[];
  readonly upsertEntry: (entry: MemoryEntry) => void;
  readonly removeEntry: (id: string) => void;
  readonly replaceAll: (entries: MemoryEntry[]) => void;
};

const MemoryContext = createContext<MemoryContextValue | null>(null);

export const MemoryProvider = ({ children }: { readonly children: ReactNode }) => {
  const { user } = useSession();
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    queueMicrotask(() => {
      try {
        setEntries(loadMemoryEntries());
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    saveMemoryEntries(entries);
  }, [entries, hydrated, user?.id]);

  useEffect(() => {
    registerMemoryGetter(() => entries);
  }, [entries]);

  const upsertEntry = useCallback((entry: MemoryEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx === -1) return [...prev, entry];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const replaceAll = useCallback((next: MemoryEntry[]) => {
    setEntries(next);
  }, []);

  const value = useMemo(
    () => ({ entries, upsertEntry, removeEntry, replaceAll }),
    [entries, upsertEntry, removeEntry, replaceAll],
  );

  return (
    <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>
  );
};

export const useMemory = (): MemoryContextValue => {
  const ctx = useContext(MemoryContext);
  if (!ctx) {
    throw new Error("useMemory must be used within MemoryProvider");
  }
  return ctx;
};
