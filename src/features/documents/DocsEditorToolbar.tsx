"use client";

import { Button } from "@/components/ui/button";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
} from "lucide-react";

type DocsEditorToolbarProps = {
  readonly editor: Editor;
};

export const DocsEditorToolbar = ({ editor }: DocsEditorToolbarProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-card px-2 py-1.5"
      role="toolbar"
      aria-label="Formatting"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-foreground hover:bg-accent"
        aria-label="Bold"
        aria-pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-foreground hover:bg-accent"
        aria-label="Italic"
        aria-pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" aria-hidden />
      </Button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-foreground hover:bg-accent"
        aria-label="Heading 1"
        aria-pressed={editor.isActive("heading", { level: 1 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        <Heading1 className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-foreground hover:bg-accent"
        aria-label="Heading 2"
        aria-pressed={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 className="size-4" aria-hidden />
      </Button>
      <span className="mx-1 h-4 w-px bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-foreground hover:bg-accent"
        aria-label="Bullet list"
        aria-pressed={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="text-foreground hover:bg-accent"
        aria-label="Numbered list"
        aria-pressed={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" aria-hidden />
      </Button>
    </div>
  );
};
