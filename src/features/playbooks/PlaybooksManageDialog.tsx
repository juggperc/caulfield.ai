"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { BUILT_IN_PLAYBOOKS } from "./built-in-playbooks";
import type { PlaybookEntry } from "./types";
import {
  MAX_USER_PLAYBOOKS,
  addUserPlaybook,
  draftToApply,
  entryToDraft,
  playbookFieldLimits,
  readUserPlaybooks,
  removeUserPlaybook,
  updateUserPlaybook,
  writeUserPlaybooks,
  type UserPlaybookDraft,
} from "./user-playbooks-storage";

const emptyDraft = (): UserPlaybookDraft => ({
  title: "",
  description: "",
  prompt: "",
  chatMode: "inherit",
  webSearch: "inherit",
  ragMemory: "inherit",
  ragResearch: "inherit",
});

type View = "list" | "form";

type PlaybooksManageDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onUserPlaybooksChanged: () => void;
};

const selectClass = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "dark:bg-input/30",
);

export const PlaybooksManageDialog = ({
  open,
  onOpenChange,
  onUserPlaybooksChanged,
}: PlaybooksManageDialogProps) => {
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UserPlaybookDraft>(emptyDraft);
  const [listVersion, setListVersion] = useState(0);

  const userList = useMemo(() => {
    void listVersion;
    return open ? readUserPlaybooks() : [];
  }, [open, listVersion]);

  const resetToList = useCallback(() => {
    setView("list");
    setEditingId(null);
    setDraft(emptyDraft());
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetToList();
      onOpenChange(next);
    },
    [onOpenChange, resetToList],
  );

  const handleAdd = useCallback(() => {
    setEditingId(null);
    setDraft(emptyDraft());
    setView("form");
  }, []);

  const handleEdit = useCallback((e: PlaybookEntry) => {
    setEditingId(e.id);
    setDraft(entryToDraft(e));
    setView("form");
  }, []);

  const handleDuplicateBuiltin = useCallback((e: PlaybookEntry) => {
    setEditingId(null);
    setDraft({
      ...entryToDraft({ ...e, builtIn: undefined }),
      title: `${e.title} (copy)`,
    });
    setView("form");
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      writeUserPlaybooks(removeUserPlaybook(id));
      setListVersion((v) => v + 1);
      onUserPlaybooksChanged();
    },
    [onUserPlaybooksChanged],
  );

  const handleSaveForm = useCallback(() => {
    const title = draft.title.trim();
    const prompt = draft.prompt.trim();
    if (!title || !prompt) return;
    const apply = draftToApply(draft);
    if (editingId) {
      writeUserPlaybooks(
        updateUserPlaybook(editingId, {
          title,
          description: draft.description.trim() || undefined,
          prompt,
          apply,
        }),
      );
    } else {
      if (userList.length >= MAX_USER_PLAYBOOKS) return;
      const next = addUserPlaybook({
        id: crypto.randomUUID(),
        title,
        description: draft.description.trim() || undefined,
        prompt,
        apply,
      });
      writeUserPlaybooks(next);
    }
    setListVersion((v) => v + 1);
    onUserPlaybooksChanged();
    resetToList();
  }, [draft, editingId, onUserPlaybooksChanged, resetToList, userList.length]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] max-w-lg gap-0 overflow-hidden p-0" showClose>
        <DialogHeader className="border-b border-border px-4 pb-3 pt-4 pr-12">
          <DialogTitle>
            {view === "list" ? "Templates & playbooks" : editingId ? "Edit playbook" : "New playbook"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Manage saved prompt templates and workspace presets
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex max-h-[min(70vh,560px)] flex-col gap-0 overflow-hidden p-0">
          {view === "list" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {userList.length}/{MAX_USER_PLAYBOOKS} custom
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={userList.length >= MAX_USER_PLAYBOOKS}
                  onClick={handleAdd}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add
                </Button>
              </div>
              <ScrollArea className="min-h-0 flex-1 pr-2">
                <div className="space-y-4 pb-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Built-in
                    </p>
                    <ul className="space-y-1">
                      {BUILT_IN_PLAYBOOKS.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">{e.title}</div>
                            {e.description ? (
                              <div className="text-[11px] text-muted-foreground">{e.description}</div>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            title="Duplicate to customize"
                            aria-label={`Duplicate ${e.title}`}
                            onClick={() => handleDuplicateBuiltin(e)}
                          >
                            <Copy className="size-3.5" aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Yours
                    </p>
                    {userList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No custom playbooks yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {userList.map((e) => (
                          <li
                            key={e.id}
                            className="flex items-center gap-2 rounded-md border border-border px-2 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-foreground">
                                {e.title}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              aria-label={`Edit ${e.title}`}
                              onClick={() => handleEdit(e)}
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete ${e.title}`}
                              onClick={() => handleDelete(e.id)}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto p-4">
              <div className="space-y-1.5">
                <Label htmlFor="pb-title">Title</Label>
                <Input
                  id="pb-title"
                  value={draft.title}
                  maxLength={playbookFieldLimits.maxTitle}
                  onChange={(ev) => setDraft((d) => ({ ...d, title: ev.target.value }))}
                  placeholder="Short name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pb-desc">Description (optional)</Label>
                <Input
                  id="pb-desc"
                  value={draft.description}
                  maxLength={playbookFieldLimits.maxDescription}
                  onChange={(ev) => setDraft((d) => ({ ...d, description: ev.target.value }))}
                  placeholder="Shown in palette"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pb-prompt">Prompt draft</Label>
                <textarea
                  id="pb-prompt"
                  value={draft.prompt}
                  maxLength={playbookFieldLimits.maxPrompt}
                  onChange={(ev) => setDraft((d) => ({ ...d, prompt: ev.target.value }))}
                  placeholder="Inserted into chat; you can edit before sending."
                  rows={8}
                  className={cn(
                    "w-full min-h-[120px] resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm",
                    "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "dark:bg-input/30",
                  )}
                />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Also set (optional)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="pb-mode">Chat mode</Label>
                  <select
                    id="pb-mode"
                    className={selectClass}
                    value={draft.chatMode}
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        chatMode: ev.target.value as UserPlaybookDraft["chatMode"],
                      }))
                    }
                  >
                    <option value="inherit">No change</option>
                    <option value="thinking">Thinking</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pb-web">Web search</Label>
                  <select
                    id="pb-web"
                    className={selectClass}
                    value={draft.webSearch}
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        webSearch: ev.target.value as UserPlaybookDraft["webSearch"],
                      }))
                    }
                  >
                    <option value="inherit">No change</option>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pb-mem">Memory in RAG</Label>
                  <select
                    id="pb-mem"
                    className={selectClass}
                    value={draft.ragMemory}
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        ragMemory: ev.target.value as UserPlaybookDraft["ragMemory"],
                      }))
                    }
                  >
                    <option value="inherit">No change</option>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pb-res">Research in RAG</Label>
                  <select
                    id="pb-res"
                    className={selectClass}
                    value={draft.ragResearch}
                    onChange={(ev) =>
                      setDraft((d) => ({
                        ...d,
                        ragResearch: ev.target.value as UserPlaybookDraft["ragResearch"],
                      }))
                    }
                  >
                    <option value="inherit">No change</option>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-3">
                <Button type="button" variant="outline" onClick={resetToList}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveForm}
                  disabled={!draft.title.trim() || !draft.prompt.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
