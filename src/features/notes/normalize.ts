import type { Note } from "./types";

export const normalizeNote = (raw: unknown): Note | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" && o.id.length > 0 ? o.id : null;
  if (!id) return null;
  const title = typeof o.title === "string" ? o.title : "";
  const content = typeof o.content === "string" ? o.content : "";
  const createdAt =
    typeof o.createdAt === "number" && Number.isFinite(o.createdAt)
      ? o.createdAt
      : Date.now();
  const updatedAt =
    typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt)
      ? o.updatedAt
      : createdAt;
  return { id, title, content, createdAt, updatedAt };
};

export const normalizeNotesList = (items: unknown): Note[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => normalizeNote(item))
    .filter((n): n is Note => n !== null);
};
