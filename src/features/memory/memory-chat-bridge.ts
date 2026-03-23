import type { MemoryEntry } from "./memory-types";

let getMemory: () => MemoryEntry[] = () => [];

export const registerMemoryGetter = (fn: () => MemoryEntry[]) => {
  getMemory = fn;
};

export const getMemorySnapshot = (): MemoryEntry[] => getMemory();
