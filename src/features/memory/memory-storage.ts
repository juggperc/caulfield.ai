import { scopedStorageKey } from "@/features/auth/storage-scope";
import { memoryEntryFromUnknown, type MemoryEntry } from "./memory-types";

const STORAGE_KEY_BASE = "caulfield.memory.v1";

export const getMemoryStorageKey = (): string =>
  scopedStorageKey(STORAGE_KEY_BASE);

export const loadMemoryEntries = (): MemoryEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getMemoryStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: MemoryEntry[] = [];
    for (const item of parsed) {
      const e = memoryEntryFromUnknown(item);
      if (e) out.push(e);
    }
    return out;
  } catch {
    return [];
  }
};

export const saveMemoryEntries = (entries: MemoryEntry[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getMemoryStorageKey(), JSON.stringify(entries));
  } catch {
    /* quota */
  }
};
