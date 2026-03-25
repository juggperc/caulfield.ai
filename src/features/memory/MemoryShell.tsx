"use client";

import { useMemory } from "@/features/memory/memory-provider";
import { WorkspacePanelHeader } from "@/features/shell/WorkspacePanelHeader";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type MemoryShellProps = {
  readonly embedded?: boolean;
};

export const MemoryShell = ({ embedded = false }: MemoryShellProps) => {
  const { entries, upsertEntry, removeEntry } = useMemory();
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.updatedAt - a.updatedAt),
    [entries],
  );

  const handleSaveNew = useCallback(() => {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title && !body) return;
    const now = Date.now();
    const tags = draftTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    upsertEntry({
      id: crypto.randomUUID(),
      title: title || "Untitled",
      body,
      tags,
      createdAt: now,
      updatedAt: now,
    });
    setDraftTitle("");
    setDraftBody("");
    setDraftTags("");
  }, [draftTitle, draftBody, draftTags, upsertEntry]);

  const handleStartEdit = (id: string) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setEditingId(id);
    setDraftTitle(e.title);
    setDraftBody(e.body);
    setDraftTags(e.tags.join(", "));
  };

  const handleUpdate = useCallback(() => {
    if (!editingId) return;
    const e = entries.find((x) => x.id === editingId);
    if (!e) return;
    const title = draftTitle.trim();
    const body = draftBody.trim();
    const tags = draftTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    upsertEntry({
      ...e,
      title: title || "Untitled",
      body,
      tags,
      updatedAt: Date.now(),
    });
    setEditingId(null);
    setDraftTitle("");
    setDraftBody("");
    setDraftTags("");
  }, [editingId, entries, draftTitle, draftBody, draftTags, upsertEntry]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
    setDraftBody("");
    setDraftTags("");
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-muted",
        embedded ? "min-h-0" : "min-h-0 flex-1",
      )}
    >
      {embedded ? null : <WorkspacePanelHeader title="Memory" />}

      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-5",
          embedded
            ? "min-h-0"
            : "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        )}
      >
        <p className="text-sm text-muted-foreground">
          Long-lived facts and preferences. The chat agent can write here with
          tools; entries are retrieved via RAG. Storage is scoped per account when
          auth is enabled.
        </p>
        <section
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
          aria-label={editingId ? "Edit memory entry" : "New memory entry"}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {editingId ? "Edit entry" : "Add entry"}
          </h2>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Title"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Memory title"
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={4}
              placeholder="What should future chats remember?"
              className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Memory body"
            />
            <input
              type="text"
              value={draftTags}
              onChange={(e) => setDraftTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Memory tags"
            />
            <div className="flex flex-wrap gap-2">
              {editingId ? (
                <>
                  <button
                    type="button"
                    onClick={handleUpdate}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveNew}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Save to memory
                </button>
              )}
            </div>
          </div>
        </section>

        <h2 className="text-sm font-semibold text-foreground">
          Entries ({entries.length})
        </h2>

        {sortedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing stored yet. Add entries manually or let the assistant use
            memory tools during chat.
          </p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Memory entries">
            {sortedEntries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-border bg-card p-3 text-sm shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-card-foreground">
                        {e.title}
                      </p>
                      {e.tags.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {e.tags.map((t) => (
                            <span
                              key={t}
                              className="mr-1.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                            >
                              {t}
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(e.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Edit ${e.title}`}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label={`Delete ${e.title}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-card-foreground/90">
                    {e.body}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};
