import type { MemoryEntry } from "@/features/memory/memory-types";
import { tool } from "ai";
import { z } from "zod";

const emptySchema = z.object({});

const cloneMemory = (list: MemoryEntry[]): MemoryEntry[] =>
  structuredClone(list);

export type MemoryToolOutputWithSync = {
  memory: MemoryEntry[];
};

export const createMemoryToolset = (initial: MemoryEntry[]) => {
  const state = { list: cloneMemory(initial) };

  const snapshot = (): MemoryEntry[] => cloneMemory(state.list);

  const tools = {
    memory_list: tool({
      description:
        "List all memory entries (id, title, preview, tags). Use to see what is stored.",
      inputSchema: emptySchema,
      execute: async () => ({
        count: state.list.length,
        entries: state.list.map((m) => ({
          id: m.id,
          title: m.title,
          preview: m.body.slice(0, 140).replace(/\s+/g, " ").trim(),
          tags: m.tags,
          updatedAt: m.updatedAt,
        })),
        memory: snapshot(),
      }),
    }),

    memory_read: tool({
      description: "Read one memory entry in full by id.",
      inputSchema: z.object({
        memoryId: z.string().describe("Memory id from list or search"),
      }),
      execute: async ({ memoryId }) => {
        const e = state.list.find((m) => m.id === memoryId);
        if (!e) {
          return { error: `No memory with id ${memoryId}`, memory: snapshot() };
        }
        return { entry: e, memory: snapshot() };
      },
    }),

    memory_search: tool({
      description:
        "Keyword search across memory titles and bodies (case-insensitive).",
      inputSchema: z.object({
        query: z.string().describe("Search string"),
      }),
      execute: async ({ query }) => {
        const q = query.trim().toLowerCase();
        if (!q) return { matches: [] as const, memory: snapshot() };

        const terms = q.split(/\s+/).filter(Boolean);
        const matches = state.list
          .map((m) => {
            const hay = `${m.title}\n${m.body}\n${m.tags.join(" ")}`.toLowerCase();
            const hit = terms.every((t) => hay.includes(t));
            if (!hit) return null;
            const excerpt = m.body.slice(0, 220).replace(/\s+/g, " ").trim();
            return {
              id: m.id,
              title: m.title,
              excerpt: excerpt || "(empty body)",
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        return { matches, memory: snapshot() };
      },
    }),

    memory_create: tool({
      description:
        "Store something important for later: a durable fact, preference, or summary the user would want recalled in future chats.",
      inputSchema: z.object({
        title: z.string().describe("Short label for this memory"),
        body: z.string().describe("The content to remember"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Optional tags for filtering"),
      }),
      execute: async ({ title, body, tags }) => {
        const now = Date.now();
        const entry: MemoryEntry = {
          id: crypto.randomUUID(),
          title: title.trim() || "Untitled",
          body,
          tags: tags ?? [],
          createdAt: now,
          updatedAt: now,
        };
        state.list.push(entry);
        return { ok: true as const, created: entry, memory: snapshot() };
      },
    }),

    memory_update: tool({
      description:
        "Update an existing memory entry. Omit fields to leave unchanged.",
      inputSchema: z.object({
        memoryId: z.string(),
        title: z.string().optional(),
        body: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ memoryId, title, body, tags }) => {
        const idx = state.list.findIndex((m) => m.id === memoryId);
        if (idx === -1) {
          return { error: `No memory with id ${memoryId}`, memory: snapshot() };
        }
        const prev = state.list[idx];
        const next: MemoryEntry = {
          ...prev,
          title: title !== undefined ? title.trim() || "Untitled" : prev.title,
          body: body !== undefined ? body : prev.body,
          tags: tags !== undefined ? tags : prev.tags,
          updatedAt: Date.now(),
        };
        state.list[idx] = next;
        return { ok: true as const, updated: next, memory: snapshot() };
      },
    }),

    memory_delete: tool({
      description: "Delete a memory entry by id.",
      inputSchema: z.object({ memoryId: z.string() }),
      execute: async ({ memoryId }) => {
        const before = state.list.length;
        state.list = state.list.filter((m) => m.id !== memoryId);
        if (state.list.length === before) {
          return { error: `No memory with id ${memoryId}`, memory: snapshot() };
        }
        return { ok: true as const, deletedId: memoryId, memory: snapshot() };
      },
    }),
  };

  return { tools };
};
