"use client";

import { DictationMicButton } from "@/components/DictationMicButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Plus, Search, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { useNotes } from "./notes-context";

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

export const NotesShell = () => {
  const {
    filteredNotes,
    selectedId,
    setSelectedId,
    selectedNote,
    createLocalNote,
    updateLocalNote,
    deleteLocalNote,
    searchQuery,
    setSearchQuery,
  } = useNotes();

  const handleTitleChange = (value: string) => {
    if (!selectedNote) return;
    updateLocalNote(selectedNote.id, { title: value });
  };

  const handleContentChange = (value: string) => {
    if (!selectedNote) return;
    updateLocalNote(selectedNote.id, { content: value });
  };

  const handleAppendDictation = useCallback(
    (text: string) => {
      if (!selectedNote) return;
      const c = selectedNote.content ?? "";
      const sep = c.length > 0 && !/\s$/.test(c) ? " " : "";
      updateLocalNote(selectedNote.id, { content: `${c}${sep}${text}` });
    },
    [selectedNote, updateLocalNote],
  );

  return (
    <div className="flex min-h-0 flex-1 bg-muted">
      <div className="flex w-[min(100%,280px)] shrink-0 flex-col border-r border-border bg-muted">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            Notes
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:bg-accent"
            onClick={createLocalNote}
            aria-label="New note"
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="border-b border-border px-2.5 py-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="h-8 border-0 bg-card/90 pl-8 text-[13px] shadow-sm ring-1 ring-border focus-visible:ring-ring"
              aria-label="Search notes"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <ul className="px-2 py-1.5" role="listbox" aria-label="Notes list">
            {filteredNotes.length === 0 ? (
              <li className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                No notes
              </li>
            ) : (
              filteredNotes.map((note) => {
                const active = note.id === selectedId;
                return (
                  <motion.li
                    key={note.id}
                    layout
                    initial={false}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelectedId(note.id)}
                      className={
                        active
                          ? "mb-0.5 w-full rounded-lg bg-amber-50 px-2.5 py-2 text-left shadow-sm ring-1 ring-border dark:bg-amber-950/35"
                          : "mb-0.5 w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent/50"
                      }
                    >
                      <div className="truncate text-[13px] font-medium leading-snug text-foreground">
                        {note.title || "Untitled"}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {(note.content ?? "")
                            .replace(/\s+/g, " ")
                            .trim()
                            .slice(0, 52) || "No additional text"}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatListDate(note.updatedAt)}
                        </span>
                      </div>
                    </button>
                  </motion.li>
                );
              })
            )}
          </ul>
        </ScrollArea>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-card">
        {selectedNote ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-3">
              <input
                type="text"
                value={selectedNote.title ?? ""}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-[22px] font-bold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                placeholder="Title"
                aria-label="Note title"
              />
              <DictationMicButton
                onAppendFinal={handleAppendDictation}
                disabled={!selectedNote}
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                ariaLabelIdle="Dictate into note body"
                ariaLabelActive="Stop dictation"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                onClick={() => deleteLocalNote(selectedNote.id)}
                aria-label="Delete note"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
            <textarea
              value={selectedNote.content ?? ""}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-0 flex-1 resize-none border-0 bg-transparent px-6 py-4 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Start typing…"
              aria-label="Note body"
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">
            Select a note or create one
          </div>
        )}
      </div>
    </div>
  );
};
