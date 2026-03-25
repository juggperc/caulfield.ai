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
const MIN_QUERY_LENGTH_FOR_RAG = 3;

const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const EMBEDDING_CACHE_TTL_MS = 5 * 60 * 1000;

type RagChunk = {
  readonly label: string;
  readonly text: string;
};

const getCachedEmbedding = (text: string): number[] | null => {
  const cached = embeddingCache.get(text);
  if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL_MS) {
    return cached.embedding;
  }
  return null;
};

const setCachedEmbedding = (text: string, embedding: number[]): void => {
  if (embeddingCache.size > 1000) {
    const now = Date.now();
    for (const [key, val] of embeddingCache) {
      if (now - val.timestamp > EMBEDDING_CACHE_TTL_MS) {
        embeddingCache.delete(key);
      }
    }
  }
  embeddingCache.set(text, { embedding, timestamp: Date.now() });
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
  if (!q || q.length < MIN_QUERY_LENGTH_FOR_RAG) return "";

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

    const textsToEmbed = [q];
    const textToIndex = new Map<string, number>();
    textToIndex.set(q, 0);

    for (let i = 0; i < chunks.length; i++) {
      const cacheKey = `${chunks[i].text.slice(0, 100)}:${chunks[i].label}`;
      const cached = getCachedEmbedding(cacheKey);
      if (cached) {
        continue;
      }
      textToIndex.set(chunks[i].text, textsToEmbed.length);
      textsToEmbed.push(chunks[i].text);
    }

    const { embeddings } = await embedMany({
      model,
      values: textsToEmbed,
      maxParallelCalls: 4,
    });

    for (let i = 1; i < textsToEmbed.length; i++) {
      const cacheKey = `${textsToEmbed[i].slice(0, 100)}:${chunks[textToIndex.get(textsToEmbed[i])! - 1]?.label ?? ""}`;
      if (!getCachedEmbedding(cacheKey)) {
        setCachedEmbedding(cacheKey, embeddings[i]);
      }
    }

    const queryVec = embeddings[0];

    const scored: { i: number; score: number }[] = [];
    for (let i = 1; i < embeddings.length; i++) {
      const chunkIndex = textToIndex.get(textsToEmbed[i])! - 1;
      if (chunkIndex >= 0 && chunkIndex < chunks.length) {
        scored.push({
          i: chunkIndex,
          score: cosineSimilarity(queryVec, embeddings[i]),
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, TOP_K).map((s) => chunks[s.i]);

    return top
      .map((c, idx) => `[#${idx + 1}] ${c.label}\n${c.text}`)
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
};
