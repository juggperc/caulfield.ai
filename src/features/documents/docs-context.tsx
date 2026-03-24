"use client";

import { scopedStorageKey } from "@/features/auth/storage-scope";
import { useSession } from "@/features/auth/session-context";
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
  createDocumentFromImport: (
    input: Pick<WorkspaceDoc, "title" | "contentJson" | "format">,
  ) => void;
  deleteDocument: (id: string) => void;
  updateDocumentTitle: (id: string, title: string) => void;
  updateDocumentFromEditor: (id: string, contentJson: JSONContent) => void;
  replaceDocumentContent: (document: WorkspaceDoc) => void;
  applyAgentDocumentUpdate: (
    id: string,
    contentJson: JSONContent,
    newRevision: number,
  ) => void;
};

const DocsContext = createContext<DocsContextValue | null>(null);

export const DocsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSession();
  const [documents, setDocuments] = useState<WorkspaceDoc[]>([]);
  const [selectionUser, setSelectionUser] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = scopedStorageKey(DOCS_LOCAL_STORAGE_KEY);

  useEffect(() => {
    if (!user?.id) return;
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          setDocuments([]);
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
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    localStorage.setItem(storageKey, JSON.stringify(documents));
  }, [documents, hydrated, storageKey, user?.id]);

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
      format: "rich",
      createdAt: now,
      updatedAt: now,
      revision: 0,
      contentJson: emptyTipTapDoc(),
    };
    setDocuments((prev) => [doc, ...prev]);
    setSelectionUser(doc.id);
  }, []);

  const createDocumentFromImport = useCallback(
    ({
      title,
      contentJson,
      format,
    }: Pick<WorkspaceDoc, "title" | "contentJson" | "format">) => {
      const now = Date.now();
      const doc: WorkspaceDoc = {
        id: crypto.randomUUID(),
        title: title.trim() || "Imported document",
        createdAt: now,
        updatedAt: now,
        revision: 0,
        contentJson,
        format,
      };
      setDocuments((prev) => [doc, ...prev]);
      setSelectionUser(doc.id);
    },
    [],
  );

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

  const replaceDocumentContent = useCallback((document: WorkspaceDoc) => {
    setDocuments((prev) => {
      const rest = prev.filter((entry) => entry.id !== document.id);
      return [document, ...rest];
    });
    setSelectionUser(document.id);
  }, []);

  const value = useMemo(
    () => ({
      documents,
      selectedId,
      setSelectedId,
      selectedDoc,
      createDocument,
      createDocumentFromImport,
      deleteDocument,
      updateDocumentTitle,
      updateDocumentFromEditor,
      replaceDocumentContent,
      applyAgentDocumentUpdate,
    }),
    [
      documents,
      selectedId,
      setSelectedId,
      selectedDoc,
      createDocument,
      createDocumentFromImport,
      deleteDocument,
      updateDocumentTitle,
      updateDocumentFromEditor,
      replaceDocumentContent,
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
