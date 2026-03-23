import type { Note } from "@/features/notes/types";

export type NoteTextChunk = {
  noteId: string;
  title: string;
  text: string;
  chunkIndex: number;
};

const MAX_CHUNKS_TOTAL = 48;

export const chunkNotesForRag = (
  notes: Note[],
  maxChunk = 420,
  overlap = 72,
): NoteTextChunk[] => {
  const chunks: NoteTextChunk[] = [];

  for (const note of notes) {
    const full = `# ${note.title ?? ""}\n${note.content ?? ""}`.trim();
    if (!full) continue;

    let start = 0;
    let idx = 0;

    while (start < full.length && chunks.length < MAX_CHUNKS_TOTAL) {
      const end = Math.min(start + maxChunk, full.length);
      chunks.push({
        noteId: note.id,
        title: note.title,
        text: full.slice(start, end),
        chunkIndex: idx,
      });
      idx += 1;
      if (end === full.length) break;
      start = Math.max(0, end - overlap);
    }
    if (chunks.length >= MAX_CHUNKS_TOTAL) break;
  }

  return chunks;
};
