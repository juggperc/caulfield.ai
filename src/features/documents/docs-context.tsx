"use client";

import type { JSONContent } from "@tiptap/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DOCS_LOCAL_STORAGE_KEY } from "./constants";
import { normalizeWorkspaceDocList } from "./normalize";
import { emptyTipTapDoc, type WorkspaceDoc } from "./types";

type DocsContextValue = {
  documents: WorkspaceDoc[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedDoc: WorkspaceDoc | undefined;
  createDocument: () => void;
  deleteDocument: (id: string) => void;
  updateDocumentTitle: (id: string, title: string) => void;
  updateDocumentFromEditor: (id: string, contentJson: JSONContent) => void;
  applyAgentDocumentUpdate: (
    id: string,
    contentJson: JSONContent,
    newRevision: number,
  ) => void;
};

const DocsContext = createContext<DocsContextValue | null>(null);

export const DocsProvider = ({ children }: { children: React.ReactNode }) => {
  const [documents, setDocuments] = useState<WorkspaceDoc[]>([]);
  const [selectionUser, setSelectionUser] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(DOCS_LOCAL_STORAGE_KEY);
        if (!raw) {
          setHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        setDocuments(normalizeWorkspaceDocList(parsed));
      } catch {
        /* ignore */
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(DOCS_LOCAL_STORAGE_KEY, JSON.stringify(documents));
  }, [documents, hydrated]);

  const sorted = useMemo(
    () => [...documents].sort((a, b) => b.updatedAt - a.updatedAt),
    [documents],
  );

  const selectedId = useMemo(() => {
    if (documents.length === 0) return null;
    if (
      selectionUser != null &&
      documents.some((d) => d.id === selectionUser)
    ) {
      return selectionUser;
    }
    return sorted[0]?.id ?? null;
  }, [documents, selectionUser, sorted]);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectionUser(id);
  }, []);

  const selectedDoc = documents.find((d) => d.id === selectedId);

  const createDocument = useCallback(() => {
    const now = Date.now();
    const doc: WorkspaceDoc = {
      id: crypto.randomUUID(),
      title: "Untitled document",
      createdAt: now,
      updatedAt: now,
      revision: 0,
      contentJson: emptyTipTapDoc(),
    };
    setDocuments((prev) => [doc, ...prev]);
    setSelectionUser(doc.id);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setSelectionUser((cur) => (cur === id ? null : cur));
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const updateDocumentTitle = useCallback((id: string, title: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        return {
          ...d,
          title: title.trim() || "Untitled document",
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const updateDocumentFromEditor = useCallback(
    (id: string, contentJson: JSONContent) => {
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          return { ...d, contentJson, updatedAt: Date.now() };
        }),
      );
    },
    [],
  );

  const applyAgentDocumentUpdate = useCallback(
    (id: string, contentJson: JSONContent, newRevision: number) => {
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          return {
            ...d,
            contentJson,
            revision: newRevision,
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      documents,
      selectedId,
      setSelectedId,
      selectedDoc,
      createDocument,
      deleteDocument,
      updateDocumentTitle,
      updateDocumentFromEditor,
      applyAgentDocumentUpdate,
    }),
    [
      documents,
      selectedId,
      setSelectedId,
      selectedDoc,
      createDocument,
      deleteDocument,
      updateDocumentTitle,
      updateDocumentFromEditor,
      applyAgentDocumentUpdate,
    ],
  );

  return (
    <DocsContext.Provider value={value}>{children}</DocsContext.Provider>
  );
};

export const useDocs = () => {
  const ctx = useContext(DocsContext);
  if (!ctx) {
    throw new Error("useDocs must be used within DocsProvider");
  }
  return ctx;
};
