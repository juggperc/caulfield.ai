"use client";

import type { JSONContent } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { DocsEditorToolbar } from "./DocsEditorToolbar";

type DocsRichEditorProps = {
  readonly docId: string;
  readonly contentJson: JSONContent;
  readonly onContentChange: (json: JSONContent) => void;
  readonly onSelectionActivity: (sel: {
    from: number;
    to: number;
    text: string;
  }) => void;
  readonly onEditorReady: (editor: Editor | null) => void;
};

export const DocsRichEditor = ({
  docId,
  contentJson,
  onContentChange,
  onSelectionActivity,
  onEditorReady,
}: DocsRichEditorProps) => {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Link.configure({ openOnClick: false, autolink: true }),
        Underline,
        Highlight,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({ placeholder: "Write here…" }),
      ],
      content: contentJson,
      onUpdate: ({ editor: ed }) => {
        onContentChange(ed.getJSON());
      },
      onSelectionUpdate: ({ editor: ed }) => {
        const { from, to } = ed.state.selection;
        const text = ed.state.doc.textBetween(from, to, "\n");
        onSelectionActivity({ from, to, text });
      },
      editorProps: {
        attributes: {
          class:
            "min-h-[min(70vh,520px)] w-full max-w-none px-4 py-6 text-[0.95rem] leading-relaxed text-foreground outline-none focus:outline-none md:px-6 md:py-8 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-border [&_p]:my-2 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_td]:min-w-[6rem] [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:min-w-[6rem] [&_th]:border [&_th]:border-border [&_th]:bg-muted/70 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
        },
      },
    },
    [docId],
  );

  useEffect(() => {
    onEditorReady(editor ?? null);
    return () => {
      onEditorReady(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    const cur = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(contentJson);
    if (cur !== next) {
      editor.commands.setContent(contentJson, { emitUpdate: false });
    }
  }, [contentJson, editor]);

  if (!editor) {
    return (
      <div
        className="min-h-[min(70vh,520px)] bg-card"
        aria-busy="true"
        aria-label="Loading editor"
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <DocsEditorToolbar editor={editor} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
