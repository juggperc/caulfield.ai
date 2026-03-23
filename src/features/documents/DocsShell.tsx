"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  clearPendingDocsAssistantInput,
  peekPendingDocsAssistantInput,
} from "@/features/ai-context-menu/ai-pending-prompts";
import { useDocsAgentChat } from "@/features/ai-agent/useDocsAgentChat";
import { applySheetCellsToSheet } from "@/features/documents/client/apply-sheet-cells";
import type { DocEditsOutput, SheetCellsOutput } from "@/features/documents/file-spec";
import { MessageFeed } from "@/features/chat-ui/MessageFeed";
import { motion } from "framer-motion";
import { ArrowUp, LayoutGrid, Plus, Sparkles, Table, Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { applyDocEditsBatchToEditor } from "./client/apply-doc-edits";
import {
  registerDocsChatSnapshot,
  resetDocsChatSnapshot,
  type DocsChatSelection,
} from "./docs-chat-bridge";
import { useDocs } from "./docs-context";
import { DocsRichEditor } from "./DocsRichEditor";
import { SheetsWorkspace } from "./SheetsWorkspace";
import { useSheets } from "./sheets-context";

type WorkspaceTab = "docs" | "sheets";

const formatListDate = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const DocsShell = () => {
  const {
    documents,
    selectedId,
    setSelectedId,
    selectedDoc,
    createDocument,
    deleteDocument,
    updateDocumentTitle,
    updateDocumentFromEditor,
    applyAgentDocumentUpdate,
  } = useDocs();

  const { sheets, applyAgentSheetUpdate } = useSheets();

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => b.updatedAt - a.updatedAt),
    [documents],
  );

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("docs");
  const editorRef = useRef<Editor | null>(null);
  const selectionRef = useRef<DocsChatSelection | null>(null);
  const selectedDocRef = useRef(selectedDoc);

  const [selectionPanelOpen, setSelectionPanelOpen] = useState(false);
  const [frozenSelection, setFrozenSelection] =
    useState<DocsChatSelection | null>(null);
  const [selectionInstruction, setSelectionInstruction] = useState("");

  const handleDocEditsBatchFromAgent = useCallback(
    (payloads: DocEditsOutput[]) => {
      const ed = editorRef.current;
      const doc = selectedDocRef.current;
      if (!ed || !doc) return;
      const result = applyDocEditsBatchToEditor(ed, payloads, doc.revision);
      if (result.ok && result.newRevision !== doc.revision) {
        applyAgentDocumentUpdate(doc.id, ed.getJSON(), result.newRevision);
      }
    },
    [applyAgentDocumentUpdate],
  );

  const handleSheetCellsBatchFromAgent = useCallback(
    (payloads: SheetCellsOutput[]) => {
      for (const p of payloads) {
        const sh = sheets.find((s) => s.id === p.sheetId);
        if (!sh) continue;
        const result = applySheetCellsToSheet(sh, p);
        if (result.ok) {
          applyAgentSheetUpdate(p.sheetId, result.rows, result.newRevision);
        }
      }
    },
    [sheets, applyAgentSheetUpdate],
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
  } = useDocsAgentChat({
    onDocEditsBatchFromAgent: handleDocEditsBatchFromAgent,
    onSheetCellsBatchFromAgent: handleSheetCellsBatchFromAgent,
  });

  const docsAssistTextareaRef = useRef<HTMLTextAreaElement>(null);
  const initialDocsAssist = useMemo(() => {
    const p = peekPendingDocsAssistantInput() ?? "";
    return { text: p, focus: p.length > 0 };
  }, []);
  const [chatInput, setChatInput] = useState(initialDocsAssist.text);

  useLayoutEffect(() => {
    clearPendingDocsAssistantInput();
    if (!initialDocsAssist.focus) return;
    docsAssistTextareaRef.current?.focus();
  }, [initialDocsAssist.focus]);

  useEffect(() => {
    selectedDocRef.current = selectedDoc;
  }, [selectedDoc]);

  useEffect(() => {
    registerDocsChatSnapshot({
      getActiveDocument: () => {
        const d = selectedDocRef.current;
        if (!d) return undefined;
        return {
          id: d.id,
          title: d.title,
          revision: d.revision,
          contentJson: d.contentJson,
        };
      },
      getPlainText: () => editorRef.current?.getText() ?? "",
      getSelection: () => {
        const s = selectionRef.current;
        if (!s || s.from === s.to) return undefined;
        return s;
      },
    });
    return () => {
      resetDocsChatSnapshot();
    };
  }, []);

  const handleEditorReady = useCallback((ed: Editor | null) => {
    editorRef.current = ed;
  }, []);

  const handleSelectionActivity = useCallback(
    (sel: { from: number; to: number; text: string }) => {
      selectionRef.current = sel;
    },
    [],
  );

  const handleSendChat = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (status === "submitted" || status === "streaming") return;
    clearError();
    setChatInput("");
    await sendMessage({ text: trimmed });
  };

  const handleSendChatKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    void handleSendChat(chatInput);
  };

  const handleToggleSelectionPanel = () => {
    if (selectionPanelOpen) {
      setSelectionPanelOpen(false);
      setFrozenSelection(null);
      setSelectionInstruction("");
      return;
    }
    const s = selectionRef.current;
    if (!s || s.from === s.to) return;
    setFrozenSelection(s);
    setSelectionInstruction("");
    setSelectionPanelOpen(true);
  };

  const handleSubmitSelectionEdit = async () => {
    const instr = selectionInstruction.trim();
    if (!instr || !frozenSelection) return;
    if (status === "submitted" || status === "streaming") return;
    clearError();
    setSelectionPanelOpen(false);
    await sendMessage(
      { text: instr },
      { body: { docSelection: frozenSelection } },
    );
    setFrozenSelection(null);
    setSelectionInstruction("");
  };

  const assistantInputDisabled =
    (workspaceTab === "docs" && !selectedDoc) ||
    !chatInput.trim() ||
    status === "submitted" ||
    status === "streaming";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-sidebar">
      <header className="flex shrink-0 items-center gap-1 border-b border-border bg-sidebar px-3 py-2">
        <WorkspaceTabButton
          active={workspaceTab === "docs"}
          icon={<LayoutGrid className="size-4 opacity-70" aria-hidden />}
          label="Docs"
          onClick={() => setWorkspaceTab("docs")}
        />
        <WorkspaceTabButton
          active={workspaceTab === "sheets"}
          icon={<Table className="size-4 opacity-70" aria-hidden />}
          label="Sheets"
          onClick={() => setWorkspaceTab("sheets")}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {workspaceTab === "docs" ? (
          <>
        <div className="flex w-[min(100%,260px)] shrink-0 flex-col border-r border-border bg-sidebar">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <span className="text-[13px] font-semibold tracking-tight text-foreground">
              Documents
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:bg-accent"
              onClick={createDocument}
              aria-label="New document"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="px-2 py-1.5" role="listbox" aria-label="Documents list">
              {sortedDocuments.length === 0 ? (
                <li className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                  No documents yet
                </li>
              ) : (
                sortedDocuments.map((doc) => {
                  const active = doc.id === selectedId;
                  return (
                    <motion.li
                      key={doc.id}
                      layout
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => setSelectedId(doc.id)}
                        className={
                          active
                            ? "mb-0.5 w-full rounded-lg bg-card px-2.5 py-2 text-left shadow-sm ring-1 ring-border"
                            : "mb-0.5 w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent/50"
                        }
                      >
                        <div className="truncate text-[13px] font-medium leading-snug text-foreground">
                          {doc.title || "Untitled document"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatListDate(doc.updatedAt)}
                        </div>
                      </button>
                    </motion.li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-border bg-card">
          {selectedDoc ? (
            <>
              <div className="shrink-0 border-b border-border px-4 py-3">
                <div className="flex items-start gap-2">
                  <Input
                    value={selectedDoc.title}
                    onChange={(e) =>
                      updateDocumentTitle(selectedDoc.id, e.target.value)
                    }
                    placeholder="Title"
                    className="h-auto border-0 bg-transparent px-0 text-[22px] font-bold tracking-tight text-foreground shadow-none focus-visible:ring-0"
                    aria-label="Document title"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => deleteDocument(selectedDoc.id)}
                    aria-label="Delete document"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
              <DocsRichEditor
                key={selectedDoc.id}
                docId={selectedDoc.id}
                contentJson={selectedDoc.contentJson}
                onContentChange={(json) =>
                  updateDocumentFromEditor(selectedDoc.id, json)
                }
                onSelectionActivity={handleSelectionActivity}
                onEditorReady={handleEditorReady}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
              <p className="text-sm text-muted-foreground">
                Create a document to start writing.
              </p>
              <Button type="button" variant="outline" onClick={createDocument}>
                New document
              </Button>
            </div>
          )}
        </div>
          </>
        ) : (
          <SheetsWorkspace />
        )}

        <div className="flex w-[min(100%,340px)] shrink-0 flex-col bg-background">
          <div className="shrink-0 border-b border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-foreground">
                Workspace assistant
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="gap-1"
                disabled={workspaceTab !== "docs" || !selectedDoc}
                aria-expanded={selectionPanelOpen}
                aria-controls="docs-selection-edit-panel"
                onClick={handleToggleSelectionPanel}
                aria-label="Edit selected text with AI"
              >
                <Sparkles className="size-3.5 opacity-70" aria-hidden />
                {selectionPanelOpen ? "Close" : "Edit selection"}
              </Button>
            </div>
            {workspaceTab === "docs" && selectionPanelOpen ? (
              <div
                id="docs-selection-edit-panel"
                className="mt-3 rounded-md border border-border bg-muted/40 p-2.5"
                role="region"
                aria-label="Edit selection with AI"
              >
                <p className="text-xs text-muted-foreground">
                  Describe how to change the highlighted text. The frozen
                  selection is sent with your next message.
                </p>
                {frozenSelection?.text ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    “{frozenSelection.text.slice(0, 280)}
                    {frozenSelection.text.length > 280 ? "…" : ""}”
                  </p>
                ) : null}
                <textarea
                  value={selectionInstruction}
                  onChange={(e) => setSelectionInstruction(e.target.value)}
                  placeholder="e.g. Make this more concise and formal"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Instructions for editing selection"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.shiftKey) return;
                    e.preventDefault();
                    void handleSubmitSelectionEdit();
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={
                    !selectionInstruction.trim() ||
                    status === "submitted" ||
                    status === "streaming"
                  }
                  onClick={() => void handleSubmitSelectionEdit()}
                >
                  Send to assistant
                </Button>
              </div>
            ) : null}
          </div>
          <MessageFeed messages={messages} status={status} error={error} />
          <div className="shrink-0 border-t border-border p-2">
            <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2">
              <textarea
                ref={docsAssistTextareaRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleSendChatKeyDown}
                placeholder={
                  workspaceTab === "sheets"
                    ? "Ask about sheets or the document…"
                    : "Ask to edit the document…"
                }
                rows={2}
                disabled={workspaceTab === "docs" && !selectedDoc}
                className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent text-[0.9375rem] leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-50"
                aria-label="Workspace assistant input"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                disabled={assistantInputDisabled}
                aria-label="Send message"
                onClick={() => void handleSendChat(chatInput)}
              >
                <ArrowUp className="size-4" aria-hidden />
              </Button>
            </div>
            {status === "streaming" ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="mt-1 w-full text-muted-foreground"
                onClick={() => void stop()}
              >
                Stop
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

type WorkspaceTabButtonProps = {
  readonly active: boolean;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly onClick: () => void;
};

const WorkspaceTabButton = ({
  active,
  label,
  icon,
  onClick,
}: WorkspaceTabButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex items-center gap-1.5 rounded-md bg-sidebar-accent px-2.5 py-1.5 text-left text-[13px] font-medium text-sidebar-foreground"
          : "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </button>
  );
};
