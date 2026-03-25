"use client";

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandInputWrap,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  readChatMode,
  readChatRagMemoryEnabled,
  readChatRagResearchEnabled,
  writeChatMode,
  writeChatRagMemoryEnabled,
  writeChatRagResearchEnabled,
  type StoredChatMode,
} from "@/features/ai-agent/storage";
import { applyPlaybook } from "@/features/playbooks/apply-playbook";
import { BUILT_IN_PLAYBOOKS } from "@/features/playbooks/built-in-playbooks";
import { PlaybooksManageDialog } from "@/features/playbooks/PlaybooksManageDialog";
import { readUserPlaybooks } from "@/features/playbooks/user-playbooks-storage";
import type { ChatModelsUiConfig } from "@/features/openrouter/chat-models-ui";
import { cn } from "@/lib/utils";
import { Brain, Check, LayoutTemplate, Microscope, Rocket, Search, Sparkles, Zap } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type PaletteProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onWorkspaceUpdated: () => void;
  readonly onOpenResearch: () => void;
  readonly onOpenMemory: () => void;
  readonly chatModels: ChatModelsUiConfig;
};

export const WorkspaceCommandPalette = ({
  open,
  onOpenChange,
  onWorkspaceUpdated,
  onOpenResearch,
  onOpenMemory,
  chatModels,
}: PaletteProps) => {
  const [, setTick] = useState(0);
  const refreshLocal = useCallback(() => setTick((n) => n + 1), []);
  const [managePlaybooksOpen, setManagePlaybooksOpen] = useState(false);
  const [playbookListNonce, setPlaybookListNonce] = useState(0);

  const mergedPlaybooks = useMemo(() => {
    void playbookListNonce;
    if (!open) return [...BUILT_IN_PLAYBOOKS];
    return [...BUILT_IN_PLAYBOOKS, ...readUserPlaybooks()];
  }, [open, playbookListNonce]);

  const handleUserPlaybooksChanged = useCallback(() => {
    setPlaybookListNonce((n) => n + 1);
    onWorkspaceUpdated();
  }, [onWorkspaceUpdated]);

  const mode = readChatMode();
  const memOn = readChatRagMemoryEnabled();
  const resOn = readChatRagResearchEnabled();

  const handleMode = useCallback(
    (next: StoredChatMode) => {
      writeChatMode(next);
      onWorkspaceUpdated();
      refreshLocal();
      onOpenChange(false);
    },
    [onOpenChange, onWorkspaceUpdated, refreshLocal],
  );

  const handleToggleMemory = useCallback(() => {
    if (typeof window === "undefined") return;
    writeChatRagMemoryEnabled(!readChatRagMemoryEnabled());
    onWorkspaceUpdated();
    refreshLocal();
  }, [onWorkspaceUpdated, refreshLocal]);

  const handleToggleResearchRag = useCallback(() => {
    if (typeof window === "undefined") return;
    writeChatRagResearchEnabled(!readChatRagResearchEnabled());
    onWorkspaceUpdated();
    refreshLocal();
  }, [onWorkspaceUpdated, refreshLocal]);

  const handleOpenResearch = useCallback(() => {
    onOpenChange(false);
    onOpenResearch();
  }, [onOpenChange, onOpenResearch]);

  const handleOpenMemory = useCallback(() => {
    onOpenChange(false);
    onOpenMemory();
  }, [onOpenChange, onOpenMemory]);

  const handleSelectPlaybook = useCallback(
    (entryId: string) => {
      const entry = mergedPlaybooks.find((p) => p.id === entryId);
      if (!entry) return;
      applyPlaybook(entry, { onWorkspaceUpdated });
      onOpenChange(false);
    },
    [mergedPlaybooks, onOpenChange, onWorkspaceUpdated],
  );

  const handleOpenManagePlaybooks = useCallback(() => {
    onOpenChange(false);
    setManagePlaybooksOpen(true);
  }, [onOpenChange]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg"
        showClose
      >
        <DialogHeader className="border-b border-border px-4 pb-3 pt-4 pr-12">
          <DialogTitle>Workspace</DialogTitle>
          <DialogDescription className="sr-only">
            Chat mode, RAG context, research and memory panels
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="p-0">
          <Command className="rounded-none border-0 bg-transparent shadow-none">
            <CommandInputWrap>
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <CommandInput placeholder="Filter…" />
            </CommandInputWrap>
            <CommandList>
              <CommandGroup heading="Mode">
                <CommandItem
                  value={`thinking ${chatModels.thinkingLabel}`}
                  onSelect={() => handleMode("thinking")}
                  className="gap-2"
                >
                  <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">
                      {chatModels.thinkingLabel}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Uses quota · supports images in chat
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      mode === "thinking" ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
                <CommandItem
                  value={`free ${chatModels.freeLabel}`}
                  onSelect={() => handleMode("free")}
                  className="gap-2"
                >
                  <Zap className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">
                      {chatModels.freeLabel}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      No quota · free tier may log prompts
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      mode === "free" ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
                <CommandItem
                  value={`freefast ${chatModels.freeFastLabel}`}
                  onSelect={() => handleMode("freeFast")}
                  className="gap-2"
                >
                  <Zap className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">
                      {chatModels.freeFastLabel}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      No quota · fastest free model
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      mode === "freeFast" ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
                <CommandItem
                  value={`max ${chatModels.maxLabel}`}
                  onSelect={() => handleMode("max")}
                  className="gap-2"
                >
                  <Rocket className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">
                      {chatModels.maxLabel}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Uses quota · most capable model
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      mode === "max" ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Context">
                <CommandItem
                  value="memory rag"
                  onSelect={handleToggleMemory}
                  className="gap-2"
                >
                  <Brain className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1">Memory in RAG</span>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      memOn ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
                <CommandItem
                  value="research rag snippets"
                  onSelect={handleToggleResearchRag}
                  className="gap-2"
                >
                  <Microscope className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1">Research in RAG</span>
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      resOn ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Open">
                <CommandItem
                  value="research snippets knowledge panel"
                  onSelect={handleOpenResearch}
                  className="gap-2"
                >
                  <Microscope className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">Research snippets</div>
                    <div className="text-[11px] text-muted-foreground">
                      Cited sources · Knowledge library
                    </div>
                  </div>
                </CommandItem>
                <CommandItem
                  value="memory panel"
                  onSelect={handleOpenMemory}
                  className="gap-2"
                >
                  <Brain className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">Memory</div>
                    <div className="text-[11px] text-muted-foreground">
                      Edit saved entries
                    </div>
                  </div>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Templates & playbooks">
                {mergedPlaybooks.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`template playbook ${p.title} ${p.description ?? ""} ${p.prompt.slice(0, 240)}`}
                    onSelect={() => handleSelectPlaybook(p.id)}
                    className="gap-2"
                  >
                    <LayoutTemplate className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">{p.title}</div>
                      {p.description ? (
                        <div className="text-[11px] text-muted-foreground">{p.description}</div>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
                <CommandItem
                  value="manage playbooks templates custom"
                  onSelect={handleOpenManagePlaybooks}
                  className="gap-2"
                >
                  <LayoutTemplate className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1 font-medium">Manage playbooks…</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogBody>
      </DialogContent>
    </Dialog>
    <PlaybooksManageDialog
      open={managePlaybooksOpen}
      onOpenChange={setManagePlaybooksOpen}
      onUserPlaybooksChanged={handleUserPlaybooksChanged}
    />
    </>
  );
};
