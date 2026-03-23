import type { Note } from "@/features/notes/types";
import { tool } from "ai";
import { z } from "zod";

const emptySchema = z.object({});

const cloneNotes = (list: Note[]): Note[] => structuredClone(list);

export type NotesToolOutputWithSync = {
  notes: Note[];
};

export const createNotesToolset = (initialNotes: Note[]) => {
  const state = { list: cloneNotes(initialNotes) };

  const snapshot = (): Note[] => cloneNotes(state.list);

  const tools = {
    notes_list: tool({
      description:
        "List every note (id, title, short preview, updatedAt). Use first to see what exists.",
      inputSchema: emptySchema,
      execute: async () => ({
        count: state.list.length,
        notes: state.list.map((n) => ({
          id: n.id,
          title: n.title,
          preview: n.content.slice(0, 140).replace(/\s+/g, " ").trim(),
          updatedAt: n.updatedAt,
        })),
      }),
    }),

    notes_read: tool({
      description:
        "Read one note in full by id. Use after list/search when you need the entire body.",
      inputSchema: z.object({
        noteId: z.string().describe("The note id from list or search results"),
      }),
      execute: async ({ noteId }) => {
        const note = state.list.find((n) => n.id === noteId);
        if (!note) {
          return { error: `No note with id ${noteId}`, notes: snapshot() };
        }
        return { note, notes: snapshot() };
      },
    }),

    notes_search: tool({
      description:
        "Keyword search across titles and bodies (case-insensitive). Returns matching excerpts.",
      inputSchema: z.object({
        query: z.string().describe("Search string; can be multiple words"),
      }),
      execute: async ({ query }) => {
        const q = query.trim().toLowerCase();
        if (!q) return { matches: [] as const, notes: snapshot() };

        const terms = q.split(/\s+/).filter(Boolean);
        const matches = state.list
          .map((n) => {
            const hay = `${n.title}\n${n.content}`.toLowerCase();
            const hit = terms.every((t) => hay.includes(t));
            if (!hit) return null;
            const excerpt = n.content.slice(0, 220).replace(/\s+/g, " ").trim();
            return {
              id: n.id,
              title: n.title,
              excerpt: excerpt || "(empty body)",
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== null);

        return { matches, notes: snapshot() };
      },
    }),

    notes_create: tool({
      description:
        "Create a new note with title and content. Returns the new id and full notes snapshot for sync.",
      inputSchema: z.object({
        title: z.string().describe("Title shown in the notes list"),
        content: z
          .string()
          .describe("Body text; markdown-style formatting is fine"),
      }),
      execute: async ({ title, content }) => {
        const now = Date.now();
        const note: Note = {
          id: crypto.randomUUID(),
          title: title.trim() || "Untitled",
          content,
          createdAt: now,
          updatedAt: now,
        };
        state.list.push(note);
        return { ok: true as const, created: note, notes: snapshot() };
      },
    }),

    notes_update: tool({
      description:
        "Update an existing note. Omit title or content to leave that field unchanged.",
      inputSchema: z.object({
        noteId: z.string(),
        title: z.string().optional().describe("New title if changing"),
        content: z.string().optional().describe("New body if changing"),
      }),
      execute: async ({ noteId, title, content }) => {
        const idx = state.list.findIndex((n) => n.id === noteId);
        if (idx === -1) {
          return { error: `No note with id ${noteId}`, notes: snapshot() };
        }
        const prev = state.list[idx];
        const next: Note = {
          ...prev,
          title: title !== undefined ? title.trim() || "Untitled" : prev.title,
          content: content !== undefined ? content : prev.content,
          updatedAt: Date.now(),
        };
        state.list[idx] = next;
        return { ok: true as const, updated: next, notes: snapshot() };
      },
    }),

    notes_delete: tool({
      description: "Permanently delete a note by id.",
      inputSchema: z.object({ noteId: z.string() }),
      execute: async ({ noteId }) => {
        const before = state.list.length;
        state.list = state.list.filter((n) => n.id !== noteId);
        const removed = before - state.list.length;
        if (removed === 0) {
          return { error: `No note with id ${noteId}`, notes: snapshot() };
        }
        return { ok: true as const, deletedId: noteId, notes: snapshot() };
      },
    }),
  };

  return { tools };
};
