"use client";

import { useDocs } from "@/features/documents/docs-context";
import { useSheets } from "@/features/documents/sheets-context";
import { tiptapJsonToPlainText } from "@/features/documents/tiptap-plain-text";
import { useLibrary } from "@/features/library/library-context";
import { useNotes } from "@/features/notes/notes-context";
import { useEffect } from "react";

const sanitizeFilename = (name: string) =>
  (name || "untitled").replace(/[^\w.\-]+/g, "_").slice(0, 120);

/** Debounced export of notes, docs, and sheets into Library (IndexedDB) by stable dedupe keys. */
export const WorkspaceLibrarySync = () => {
  const { notes } = useNotes();
  const { documents } = useDocs();
  const { sheets } = useSheets();
  const { upsertWorkspaceExport } = useLibrary();

  useEffect(() => {
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          for (const note of notes) {
            const body = `# ${note.title}\n\n${note.content}`;
            const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
            await upsertWorkspaceExport(
              `note:${note.id}`,
              `${sanitizeFilename(note.title)}.md`,
              "text/markdown",
              blob,
            );
          }
          for (const doc of documents) {
            const plain = tiptapJsonToPlainText(doc.contentJson);
            const blob = new Blob([plain], { type: "text/markdown;charset=utf-8" });
            await upsertWorkspaceExport(
              `doc:${doc.id}`,
              `${sanitizeFilename(doc.title)}.md`,
              "text/markdown",
              blob,
            );
          }
          for (const sh of sheets) {
            const lines = sh.rows.map((r) =>
              r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
            );
            const blob = new Blob([lines.join("\n")], {
              type: "text/csv;charset=utf-8",
            });
            await upsertWorkspaceExport(
              `sheet:${sh.id}`,
              `${sanitizeFilename(sh.title)}.csv`,
              "text/csv",
              blob,
            );
          }
        } catch (e) {
          console.error("[WorkspaceLibrarySync] Export failed:", e);
        }
      })();
    }, 650);
    return () => window.clearTimeout(id);
  }, [notes, documents, sheets, upsertWorkspaceExport]);

  return null;
};
