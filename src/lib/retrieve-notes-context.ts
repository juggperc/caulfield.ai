import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embedMany } from "ai";
import type { Note } from "@/features/notes/types";
import { cosineSimilarity } from "@/lib/cosine-similarity";
import { chunkNotesForRag } from "@/lib/note-chunking";

const TOP_K = 6;

export const buildRagContextBlock = async (params: {
  apiKey: string;
  embeddingModelId: string;
  userQuery: string;
  notes: Note[];
}): Promise<string> => {
  const q = params.userQuery.trim();
  if (!q || params.notes.length === 0) return "";

  const chunks = chunkNotesForRag(params.notes);
  if (chunks.length === 0) return "";

  try {
    const openrouter = createOpenRouter({ apiKey: params.apiKey });
    const model = openrouter.textEmbeddingModel(params.embeddingModelId);

    const texts = [q, ...chunks.map((c) => c.text)];
    const { embeddings } = await embedMany({
      model,
      values: texts,
      maxParallelCalls: 4,
    });

    const queryVec = embeddings[0];
    const chunkVecs = embeddings.slice(1);

    const scored = chunkVecs.map((vec, i) => ({
      i,
      score: cosineSimilarity(queryVec, vec),
    }));
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, TOP_K).map((s) => chunks[s.i]);

    return top
      .map(
        (c, idx) =>
          `[#${idx + 1}] **${c.title}** (noteId: \`${c.noteId}\`, chunk ${c.chunkIndex})\n${c.text}`,
      )
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
};
