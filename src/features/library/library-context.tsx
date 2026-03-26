"use client";

import type { FileSpecPayload } from "@/features/documents/file-spec";
import type { ImageSpecPayload } from "@/features/images/image-payload";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
 addLibraryGenerated,
 addLibraryGeneratedImage,
 addLibraryUpload,
 deleteLibraryItem,
 listLibraryItemsSorted,
 upsertLibraryWorkspaceExport,
 exportAllLibraryItems,
} from "./library-store";
import type { LibraryItemMeta } from "./types";

type LibraryContextValue = {
items: LibraryItemMeta[];
hydrated: boolean;
refresh: () => Promise<void>;
addUpload: (file: File) => Promise<void>;
removeItem: (id: string) => Promise<void>;
tryAddGeneratedFromSpec: (
 dedupeKey: string,
 payload: FileSpecPayload,
 blob: Blob,
) => Promise<void>;
tryAddGeneratedImage: (
 dedupeKey: string,
 payload: ImageSpecPayload,
) => Promise<void>;
upsertWorkspaceExport: (
 dedupeKey: string,
 filename: string,
 mimeType: string,
 blob: Blob,
) => Promise<void>;
exportAll: () => Promise<Blob>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export const LibraryProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<LibraryItemMeta[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listLibraryItemsSorted();
    setItems(list);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh().finally(() => setHydrated(true));
    });
  }, [refresh]);

  const addUpload = useCallback(
    async (file: File) => {
      await addLibraryUpload(file);
      await refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (id: string) => {
      await deleteLibraryItem(id);
      await refresh();
    },
    [refresh],
  );

  const tryAddGeneratedFromSpec = useCallback(
    async (dedupeKey: string, payload: FileSpecPayload, blob: Blob) => {
      await addLibraryGenerated(dedupeKey, payload, blob);
      await refresh();
    },
    [refresh],
  );

  const tryAddGeneratedImage = useCallback(
    async (dedupeKey: string, payload: ImageSpecPayload) => {
      await addLibraryGeneratedImage(dedupeKey, payload);
      await refresh();
    },
    [refresh],
  );

const upsertWorkspaceExport = useCallback(
 async (
  dedupeKey: string,
  filename: string,
  mimeType: string,
  blob: Blob,
 ) => {
  await upsertLibraryWorkspaceExport(dedupeKey, filename, mimeType, blob);
  await refresh();
 },
 [refresh],
 );

 const exportAll = useCallback(async () => {
  return exportAllLibraryItems();
 }, []);

 const value = useMemo(
 () => ({
  items,
  hydrated,
  refresh,
  addUpload,
  removeItem,
  tryAddGeneratedFromSpec,
  tryAddGeneratedImage,
  upsertWorkspaceExport,
  exportAll,
 }),
  [
   items,
   hydrated,
   refresh,
   addUpload,
   removeItem,
   tryAddGeneratedFromSpec,
   tryAddGeneratedImage,
   upsertWorkspaceExport,
   exportAll,
  ],
 );

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error("useLibrary must be used within LibraryProvider");
  }
  return ctx;
};
