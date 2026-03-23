"use client";

import { getDocsChatBodyFields } from "@/features/documents/docs-chat-bridge";
import type { DocEditsOutput, SheetCellsOutput } from "@/features/documents/file-spec";
import { isDocEditsOutput, isSheetCellsOutput } from "@/features/documents/file-spec";
import { getNotesSnapshot } from "@/features/notes/notes-api-bridge";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { useMemo } from "react";
import {
  readOpenRouterEmbeddingModel,
  readOpenRouterKey,
  readOpenRouterModel,
} from "./storage";

type UseDocsAgentChatOptions = {
  readonly onDocEditsBatchFromAgent?: (payloads: DocEditsOutput[]) => void;
  readonly onSheetCellsBatchFromAgent?: (payloads: SheetCellsOutput[]) => void;
};

export const useDocsAgentChat = (options?: UseDocsAgentChatOptions) => {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({
          "x-openrouter-key": readOpenRouterKey(),
          "x-openrouter-model": readOpenRouterModel(),
          "x-openrouter-embedding-model": readOpenRouterEmbeddingModel(),
        }),
        body: () => ({
          notes: getNotesSnapshot(),
          ...getDocsChatBodyFields(),
        }),
      }),
    [],
  );

  return useChat({
    id: "workspace-docs-agent",
    transport,
    onFinish: ({ message }) => {
      if (message.role !== "assistant") return;
      const docBatch: DocEditsOutput[] = [];
      const sheetBatch: SheetCellsOutput[] = [];
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        if (part.state !== "output-available") continue;
        const out = part.output;
        if (isDocEditsOutput(out)) docBatch.push(out);
        if (isSheetCellsOutput(out)) sheetBatch.push(out);
      }
      if (docBatch.length > 0) {
        options?.onDocEditsBatchFromAgent?.(docBatch);
      }
      if (sheetBatch.length > 0) {
        options?.onSheetCellsBatchFromAgent?.(sheetBatch);
      }
    },
  });
};
