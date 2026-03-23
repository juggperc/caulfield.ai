"use client";

import { scopedStorageKey } from "@/features/auth/storage-scope";
import { useSession } from "@/features/auth/session-context";
import type { Note } from "@/features/notes/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { NOTES_LOCAL_STORAGE_KEY } from "./constants";
import { normalizeNotesList } from "./normalize";
import { registerNotesGetter } from "./notes-api-bridge";

type NotesContextValue = {
  notes: Note[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedNote: Note | undefined;
  createLocalNote: () => void;
  updateLocalNote: (
    id: string,
    updates: Partial<Pick<Note, "title" | "content">>,
  ) => void;
  deleteLocalNote: (id: string) => void;
  syncNotesFromAgent: (next: Note[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredNotes: Note[];
};

const NotesContext = createContext<NotesContextValue | null>(null);

export const NotesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectionUser, setSelectionUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const storageKey = scopedStorageKey(NOTES_LOCAL_STORAGE_KEY);

  useEffect(() => {
    if (!user?.id) return;
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          setNotes([]);
          setHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setNotes(normalizeNotesList(parsed));
        }
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
    });
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [notes, hydrated, storageKey, user?.id]);

  useEffect(() => {
    registerNotesGetter(() => notes);
  }, [notes]);

  const sortedChronological = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt),
    [notes],
  );

  const selectedId = useMemo(() => {
    if (notes.length === 0) return null;
    if (
      selectionUser != null &&
      notes.some((n) => n.id === selectionUser)
    ) {
      return selectionUser;
    }
    return sortedChronological[0]?.id ?? null;
  }, [notes, selectionUser, sortedChronological]);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectionUser(id);
  }, []);

  const syncNotesFromAgent = useCallback((next: Note[]) => {
    setNotes(normalizeNotesList(next));
  }, []);

  const createLocalNote = useCallback(() => {
    const now = Date.now();
    const n: Note = {
      id: crypto.randomUUID(),
      title: "New note",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [n, ...prev]);
    setSelectionUser(n.id);
  }, []);

  const updateLocalNote = useCallback(
    (id: string, updates: Partial<Pick<Note, "title" | "content">>) => {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          return {
            ...n,
            title:
              updates.title !== undefined
                ? updates.title.trim() || "Untitled"
                : n.title,
            content:
              updates.content !== undefined
                ? updates.content
                : (n.content ?? ""),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const deleteLocalNote = useCallback((id: string) => {
    setSelectionUser((cur) => (cur === id ? null : cur));
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedChronological;
    return sortedChronological.filter((n) => {
      const title = (n.title ?? "").toLowerCase();
      const body = (n.content ?? "").toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }, [sortedChronological, searchQuery]);

  const selectedNote = notes.find((n) => n.id === selectedId);

  const value = useMemo(
    () => ({
      notes,
      selectedId,
      setSelectedId,
      selectedNote,
      createLocalNote,
      updateLocalNote,
      deleteLocalNote,
      syncNotesFromAgent,
      searchQuery,
      setSearchQuery,
      filteredNotes,
    }),
    [
      notes,
      selectedId,
      setSelectedId,
      selectedNote,
      createLocalNote,
      updateLocalNote,
      deleteLocalNote,
      syncNotesFromAgent,
      searchQuery,
      filteredNotes,
    ],
  );

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
};

export const useNotes = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) {
    throw new Error("useNotes must be used within NotesProvider");
  }
  return ctx;
};
