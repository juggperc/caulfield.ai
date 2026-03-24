"use client";

import { getSheetsChatPayload } from "@/features/documents/sheets-chat-bridge";
import { getWorkspaceDocumentsForChat } from "@/features/documents/workspace-documents-chat-bridge";
import { getMemorySnapshot } from "@/features/memory/memory-chat-bridge";
import type { MemoryEntry } from "@/features/memory/memory-types";
import { getNotesSnapshot } from "@/features/notes/notes-api-bridge";
import type { Note } from "@/features/notes/types";
import { getResearchSnapshot } from "@/features/research/research-chat-bridge";
import {
  saveConversationMessages,
  upsertConversationMeta,
} from "@/features/chat-ui/chat-history-scaffold";
import { deriveChatTitle } from "@/features/chat-ui/chat-title";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { useMemo } from "react";
import {
  readChatMode,
  readChatRagMemoryEnabled,
  readChatRagResearchEnabled,
  readIntegrationKeysForChatBody,
} from "./storage";

type UseChatWithOpenRouterOptions = {
  readonly onNotesSyncedFromAgent?: (notes: Note[]) => void;
  readonly onMemorySyncedFromAgent?: (memory: MemoryEntry[]) => void;
  readonly serverConversationId?: string | null;
  readonly persistServerHistory?: boolean;
  readonly localConversationId?: string | null;
  readonly persistLocalHistory?: boolean;
  readonly initialMessages?: UIMessage[];
  readonly chatInstanceId?: string;
  readonly onServerTitleResolved?: (title: string) => void;
};

const MAX_NOTES_IN_REQUEST = 20;
const MAX_RESEARCH_SNIPPETS_IN_REQUEST = 10;
const MAX_MEMORY_ENTRIES_IN_REQUEST = 25;
const MAX_WORKSPACE_DOCUMENTS_IN_REQUEST = 8;
const MAX_WORKSPACE_SHEETS_IN_REQUEST = 6;

export const useChatWithOpenRouter = (
  options?: UseChatWithOpenRouterOptions,
) => {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({
          "x-chat-mode": readChatMode(),
        }),
        body: () => {
          const { workspaceSheets } = getSheetsChatPayload();
          const notes = getNotesSnapshot()
            .slice(0, MAX_NOTES_IN_REQUEST)
            .map((note) => ({
              ...note,
              content: note.content.slice(0, 8_000),
            }));
          const researchSnippets = getResearchSnapshot()
            .slice(0, MAX_RESEARCH_SNIPPETS_IN_REQUEST)
            .map((snippet) => ({
              ...snippet,
              body: snippet.body.slice(0, 14_000),
            }));
          const memory = getMemorySnapshot()
            .slice(0, MAX_MEMORY_ENTRIES_IN_REQUEST)
            .map((entry) => ({
              ...entry,
              body: entry.body.slice(0, 8_000),
            }));
          const workspaceDocuments = getWorkspaceDocumentsForChat()
            .slice(0, MAX_WORKSPACE_DOCUMENTS_IN_REQUEST)
            .map((doc) => ({
              ...doc,
              plainText: doc.plainText.slice(0, 3_200),
            }));
          return {
            notes,
            researchSnippets,
            memory,
            ragIncludeMemory: readChatRagMemoryEnabled(),
            ragIncludeResearch: readChatRagResearchEnabled(),
            integrationKeys: readIntegrationKeysForChatBody(),
            workspaceDocuments,
            workspaceSheets: workspaceSheets.slice(0, MAX_WORKSPACE_SHEETS_IN_REQUEST),
          };
        },
      }),
    [],
  );

  const chatId =
    options?.chatInstanceId ??
    options?.serverConversationId ??
    "default-local-chat";

  return useChat({
    id: chatId,
    messages: options?.initialMessages ?? [],
    transport,
    onFinish: async ({ message, messages }) => {
      if (message.role === "assistant") {
        let latestNotes: Note[] | null = null;
        let latestMemory: MemoryEntry[] | null = null;
        for (const part of message.parts) {
          if (!isToolUIPart(part)) continue;
          if (part.state !== "output-available") continue;
          const out = part.output as { notes?: Note[]; memory?: MemoryEntry[] };
          if (out?.notes && Array.isArray(out.notes)) {
            latestNotes = out.notes;
          }
          if (out?.memory && Array.isArray(out.memory)) {
            latestMemory = out.memory;
          }
        }
        if (latestNotes) {
          options?.onNotesSyncedFromAgent?.(latestNotes);
        }
        if (latestMemory) {
          options?.onMemorySyncedFromAgent?.(latestMemory);
        }
      }
      const sid = options?.serverConversationId ?? null;
      const persistServer = Boolean(options?.persistServerHistory && sid);
      const title = deriveChatTitle(messages);
      if (persistServer) {
        const res = await fetch(`/api/conversations/${sid}/messages`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, title }),
        });
        if (!res.ok) {
          console.error(
            "[useChatWithOpenRouter] Failed to persist messages to server",
            res.status,
          );
        } else if (title) {
          options?.onServerTitleResolved?.(title);
        }
      }

      const lid = options?.localConversationId ?? null;
      if (options?.persistLocalHistory && lid) {
        saveConversationMessages(lid, messages);
        upsertConversationMeta({
          id: lid,
          title: title || "New chat",
          updatedAt: Date.now(),
        });
      }
    },
  });
};
