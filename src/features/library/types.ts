import type { FileSpecPayload } from "@/features/documents/file-spec";

export type LibrarySource = "generated" | "upload" | "workspace";

export type LibraryItemMeta = {
  id: string;
  source: LibrarySource;
  filename: string;
  mimeType: string;
  createdAt: number;
  updatedAt: number;
  /** Stable key to avoid duplicate rows for the same tool output (e.g. toolCallId). */
  dedupeKey?: string;
  /** Present for generated files so the blob can be rebuilt if needed. */
  fileSpec?: FileSpecPayload;
};
