"use client";

import { getSheetsChatPayload } from "@/features/documents/sheets-chat-bridge";
import { getWorkspaceDocumentsForChat } from "@/features/documents/workspace-documents-chat-bridge";
import { getNotesSnapshot } from "@/features/notes/notes-api-bridge";
import type { Note } from "@/features/notes/types";
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
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        if (part.state !== "output-available") continue;
        const out = part.output as { notes?: Note[] };
        if (out?.notes && Array.isArray(out.notes)) {
          latestNotes = out.notes;
        }
      }
      if (latestNotes) {
        options?.onNotesSyncedFromAgent?.(latestNotes);
      }
    },
  });
};
