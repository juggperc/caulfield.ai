import { getAccountStorageScope } from "@/features/auth/storage-scope";
import type { FileSpecPayload } from "@/features/documents/file-spec";
import {
  idbDeleteItem,
  idbGetAllMeta,
  idbGetBlob,
  idbPutMetaAndBlob,
  libraryDatabaseNameForScope,
  openLibraryDb,
} from "./idb";
import type { LibraryItemMeta } from "./types";

const dbPromises = new Map<string, Promise<IDBDatabase>>();

const getDb = () => {
  const scope = getAccountStorageScope();
  const name = libraryDatabaseNameForScope(scope);
  let p = dbPromises.get(name);
  if (!p) {
    p = openLibraryDb(name);
    dbPromises.set(name, p);
  }
  return p;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const toMeta = (raw: Record<string, unknown>): LibraryItemMeta | null => {
  if (typeof raw.id !== "string") return null;
  if (
    raw.source !== "generated" &&
    raw.source !== "upload" &&
    raw.source !== "workspace"
  ) {
    return null;
  }
  if (typeof raw.filename !== "string") return null;
  if (typeof raw.mimeType !== "string") return null;
  if (typeof raw.createdAt !== "number" || typeof raw.updatedAt !== "number")
    return null;
  const meta: LibraryItemMeta = {
    id: raw.id,
    source: raw.source,
    filename: raw.filename,
    mimeType: raw.mimeType,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
  if (typeof raw.dedupeKey === "string") meta.dedupeKey = raw.dedupeKey;
  if (isRecord(raw.fileSpec) && raw.fileSpec.kind === "file_spec") {
    meta.fileSpec = raw.fileSpec as FileSpecPayload;
  }
  return meta;
};

export const listLibraryItemsSorted = async (): Promise<LibraryItemMeta[]> => {
  const db = await getDb();
  const rows = await idbGetAllMeta(db);
  const items = rows
    .map((r) => toMeta(r))
    .filter((m): m is LibraryItemMeta => m !== null);
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const findByDedupeKey = async (
  dedupeKey: string,
): Promise<LibraryItemMeta | null> => {
  const items = await listLibraryItemsSorted();
  return items.find((i) => i.dedupeKey === dedupeKey) ?? null;
};

export const addLibraryUpload = async (file: File): Promise<LibraryItemMeta> => {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const buf = await file.arrayBuffer();
  const meta: LibraryItemMeta = {
    id,
    source: "upload",
    filename: file.name || "upload",
    mimeType: file.type || "application/octet-stream",
    createdAt: now,
    updatedAt: now,
  };
  await idbPutMetaAndBlob(db, { ...meta }, buf);
  return meta;
};

export const upsertLibraryWorkspaceExport = async (
  dedupeKey: string,
  filename: string,
  mimeType: string,
  blob: Blob,
): Promise<LibraryItemMeta> => {
  const db = await getDb();
  const buf = await blob.arrayBuffer();
  const now = Date.now();
  const existing = await findByDedupeKey(dedupeKey);
  if (existing) {
    const meta: LibraryItemMeta = {
      ...existing,
      filename: filename.trim() || existing.filename,
      mimeType: mimeType.trim() || existing.mimeType,
      updatedAt: now,
      dedupeKey,
    };
    await idbPutMetaAndBlob(db, { ...meta }, buf);
    return meta;
  }
  const id = crypto.randomUUID();
  const meta: LibraryItemMeta = {
    id,
    source: "workspace",
    filename: filename.trim() || "export",
    mimeType: blob.type || mimeType || "application/octet-stream",
    createdAt: now,
    updatedAt: now,
    dedupeKey,
  };
  await idbPutMetaAndBlob(db, { ...meta }, buf);
  return meta;
};

export const addLibraryGenerated = async (
  dedupeKey: string,
  payload: FileSpecPayload,
  blob: Blob,
): Promise<LibraryItemMeta | null> => {
  const existing = await findByDedupeKey(dedupeKey);
  if (existing) return existing;

  const db = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const buf = await blob.arrayBuffer();
  const mime =
    blob.type ||
    (payload.format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : payload.format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : payload.format === "csv"
          ? "text/csv"
          : payload.format === "md"
            ? "text/markdown"
            : "text/plain");

  const meta: LibraryItemMeta = {
    id,
    source: "generated",
    filename: payload.filename,
    mimeType: mime,
    createdAt: now,
    updatedAt: now,
    dedupeKey,
    fileSpec: payload,
  };

  await idbPutMetaAndBlob(db, { ...meta, fileSpec: payload }, buf);
  return meta;
};

export const deleteLibraryItem = async (id: string): Promise<void> => {
  const db = await getDb();
  await idbDeleteItem(db, id);
};

export const getLibraryBlob = async (id: string): Promise<Blob | null> => {
  const db = await getDb();
  const buf = await idbGetBlob(db, id);
  if (!buf) return null;
  const items = await listLibraryItemsSorted();
  const meta = items.find((i) => i.id === id);
  return new Blob([buf], { type: meta?.mimeType ?? "application/octet-stream" });
};
