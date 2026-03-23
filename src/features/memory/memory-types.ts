export type MemoryEntry = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly tags: string[];
  readonly createdAt: number;
  readonly updatedAt: number;
};

export const memoryEntryFromUnknown = (value: unknown): MemoryEntry | null => {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  if (typeof o.title !== "string") return null;
  if (typeof o.body !== "string") return null;
  if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === "string")) {
    return null;
  }
  if (typeof o.createdAt !== "number" || typeof o.updatedAt !== "number") {
    return null;
  }
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    tags: o.tags,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};
