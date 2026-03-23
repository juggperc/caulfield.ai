"use client";

import { getSheetsChatPayload } from "@/features/documents/sheets-chat-bridge";
import { getWorkspaceDocumentsForChat } from "@/features/documents/workspace-documents-chat-bridge";
import { getMemorySnapshot } from "@/features/memory/memory-chat-bridge";
import type { MemoryEntry } from "@/features/memory/memory-types";
import { getNotesSnapshot } from "@/features/notes/notes-api-bridge";
import type { Note } from "@/features/notes/types";
import { getResearchSnapshot } from "@/features/research/research-chat-bridge";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { useMemo } from "react";
import {
  readIntegrationKeysForChatBody,
  readOpenRouterEmbeddingModel,
  readOpenRouterKey,
  readOpenRouterModel,
} from "./storage";

type UseChatWithOpenRouterOptions = {
  readonly onNotesSyncedFromAgent?: (notes: Note[]) => void;
  readonly onMemorySyncedFromAgent?: (memory: MemoryEntry[]) => void;
};

export const useChatWithOpenRouter = (
  options?: UseChatWithOpenRouterOptions,
) => {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({
          "x-openrouter-key": readOpenRouterKey(),
          "x-openrouter-model": readOpenRouterModel(),
          "x-openrouter-embedding-model": readOpenRouterEmbeddingModel(),
        }),
        body: () => {
          const { workspaceSheets } = getSheetsChatPayload();
          return {
            notes: getNotesSnapshot(),
            researchSnippets: getResearchSnapshot(),
            memory: getMemorySnapshot(),
            integrationKeys: readIntegrationKeysForChatBody(),
            workspaceDocuments: getWorkspaceDocumentsForChat(),
            workspaceSheets,
          };
        },
      }),
    [],
  );

  return useChat({
    transport,
    onFinish: ({ message }) => {
      if (message.role !== "assistant") return;
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
    },
  });
};
