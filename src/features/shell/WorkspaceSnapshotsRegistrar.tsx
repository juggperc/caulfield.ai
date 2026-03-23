"use client";

import { useDocs } from "@/features/documents/docs-context";
import { WORKSPACE_CHAT_DOC_PLAIN_MAX } from "@/features/documents/limits";
import {
  registerSheetsChatSnapshot,
  resetSheetsChatSnapshot,
} from "@/features/documents/sheets-chat-bridge";
import { useSheets } from "@/features/documents/sheets-context";
import { tiptapJsonToPlainText } from "@/features/documents/tiptap-plain-text";
import {
  registerWorkspaceDocumentsForChat,
  resetWorkspaceDocumentsForChat,
} from "@/features/documents/workspace-documents-chat-bridge";
import { useEffect, useLayoutEffect, useRef } from "react";

const truncatePlain = (s: string, max: number) => {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…(truncated)`;
};

/** Keeps docs + sheets snapshots in sync for /api/chat (main chat + docs assistant). */
export const WorkspaceSnapshotsRegistrar = () => {
  const { documents } = useDocs();
  const { sheets, selectedId } = useSheets();

  const docsRef = useRef(documents);
  const sheetsRef = useRef(sheets);
  const selectedIdRef = useRef(selectedId);

  useLayoutEffect(() => {
    docsRef.current = documents;
  }, [documents]);

  useLayoutEffect(() => {
    sheetsRef.current = sheets;
    selectedIdRef.current = selectedId;
  }, [sheets, selectedId]);

  useEffect(() => {
    registerWorkspaceDocumentsForChat(() =>
      docsRef.current.map((d) => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
        revision: d.revision,
        plainText: truncatePlain(
          tiptapJsonToPlainText(d.contentJson),
          WORKSPACE_CHAT_DOC_PLAIN_MAX,
        ),
      })),
    );
    return () => {
      resetWorkspaceDocumentsForChat();
    };
  }, []);

  useEffect(() => {
    registerSheetsChatSnapshot({
      getAll: () => sheetsRef.current,
      getSelectedId: () => selectedIdRef.current,
    });
    return () => {
      resetSheetsChatSnapshot();
    };
  }, []);

  return null;
};
