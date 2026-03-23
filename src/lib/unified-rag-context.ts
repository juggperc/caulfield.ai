import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { embedMany } from "ai";
import type { MemoryEntry } from "@/features/memory/memory-types";
import type { Note } from "@/features/notes/types";
import type { ResearchSnippet } from "@/features/research/research-types";
import { cosineSimilarity } from "@/lib/cosine-similarity";
import { chunkNotesForRag } from "@/lib/note-chunking";

const TOP_K = 8;
const MAX_CHUNKS_TOTAL = 56;
const CHUNK_SIZE = 420;
const CHUNK_OVERLAP = 72;

type RagChunk = {
  readonly label: string;
  readonly text: string;
};

const collectAllChunks = (
  notes: Note[],
  research: ResearchSnippet[],
  memory: MemoryEntry[],
  options: { readonly includeResearch: boolean; readonly includeMemory: boolean },
): RagChunk[] => {
  const out: RagChunk[] = [];

  for (const c of chunkNotesForRag(notes, CHUNK_SIZE, CHUNK_OVERLAP)) {
    if (out.length >= MAX_CHUNKS_TOTAL) break;
    out.push({
      label: `[note] **${c.title}** (noteId: \`${c.noteId}\`, chunk ${c.chunkIndex})`,
      text: c.text,
    });
  }

  if (options.includeResearch) {
    for (const s of research) {
      const head = `[research:${s.sourceType}] **${s.title}** (id: \`${s.id}\`) — ${s.sourceUrl}`;
      const full = `Topic: ${s.topic}\n${s.body}`.trim();
      let start = 0;
      let idx = 0;
      while (start < full.length && out.length < MAX_CHUNKS_TOTAL) {
        const end = Math.min(start + CHUNK_SIZE, full.length);
        out.push({
          label: `${head} (chunk ${idx})`,
          text: full.slice(start, end),
        });
        idx += 1;
        if (end === full.length) break;
        start = Math.max(0, end - CHUNK_OVERLAP);
      }
    }
  }

  if (!options.includeMemory) {
    return out;
  }

  for (const m of memory) {
    const tagStr = m.tags.length ? ` tags: ${m.tags.join(", ")}` : "";
    const head = `[memory] **${m.title}** (id: \`${m.id}\`)${tagStr}`;
    const full = m.body.trim();
    let start = 0;
    let idx = 0;
    while (start < full.length && out.length < MAX_CHUNKS_TOTAL) {
      const end = Math.min(start + CHUNK_SIZE, full.length);
      out.push({
        label: `${head} (chunk ${idx})`,
        text: full.slice(start, end),
      });
      idx += 1;
      if (end === full.length) break;
      start = Math.max(0, end - CHUNK_OVERLAP);
    }
  }

  return out;
};

/** Semantic RAG over notes, Deep Research snippets, and Memory entries. */
export const buildUnifiedRagContextBlock = async (params: {
  readonly apiKey: string;
  readonly embeddingModelId: string;
  readonly userQuery: string;
  readonly notes: Note[];
  readonly researchSnippets: ResearchSnippet[];
  readonly memoryEntries: MemoryEntry[];
  /** When false, research snippets are omitted from embedding retrieval only. */
  readonly ragIncludeResearch?: boolean;
  /** When false, memory entries are omitted from embedding retrieval only. */
  readonly ragIncludeMemory?: boolean;
}): Promise<string> => {
  const q = params.userQuery.trim();
  if (!q) return "";

  const includeResearch = params.ragIncludeResearch !== false;
  const includeMemory = params.ragIncludeMemory !== false;

  const chunks = collectAllChunks(
    params.notes,
    params.researchSnippets,
    params.memoryEntries,
    { includeResearch, includeMemory },
  );
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
      .map((c, idx) => `[#${idx + 1}] ${c.label}\n${c.text}`)
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
};
