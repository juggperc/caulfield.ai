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
  STORAGE_KEYS,
  readChatMode,
  readChatRagMemoryEnabled,
  readChatRagResearchEnabled,
  writeChatMode,
  type StoredChatMode,
} from "@/features/ai-agent/storage";
import { cn } from "@/lib/utils";
import { Brain, Check, Microscope, Search, Sparkles, Zap } from "lucide-react";
import { useCallback, useState } from "react";

type PaletteProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onWorkspaceUpdated: () => void;
  readonly onOpenResearch: () => void;
  readonly onOpenMemory: () => void;
};

export const WorkspaceCommandPalette = ({
  open,
  onOpenChange,
  onWorkspaceUpdated,
  onOpenResearch,
  onOpenMemory,
}: PaletteProps) => {
  const [, setTick] = useState(0);
  const refreshLocal = useCallback(() => setTick((n) => n + 1), []);

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
    if (readChatRagMemoryEnabled()) {
      localStorage.setItem(STORAGE_KEYS.chatRagMemoryEnabled, "0");
    } else {
      localStorage.removeItem(STORAGE_KEYS.chatRagMemoryEnabled);
    }
    onWorkspaceUpdated();
    refreshLocal();
  }, [onWorkspaceUpdated, refreshLocal]);

  const handleToggleResearchRag = useCallback(() => {
    if (typeof window === "undefined") return;
    if (readChatRagResearchEnabled()) {
      localStorage.setItem(STORAGE_KEYS.chatRagResearchEnabled, "0");
    } else {
      localStorage.removeItem(STORAGE_KEYS.chatRagResearchEnabled);
    }
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

  return (
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
                  value="thinking grok fast"
                  onSelect={() => handleMode("thinking")}
                  className="gap-2"
                >
                  <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">Thinking</div>
                    <div className="text-[11px] text-muted-foreground">
                      Grok 4.1 Fast · uses quota
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
                  value="free nemotron"
                  onSelect={() => handleMode("free")}
                  className="gap-2"
                >
                  <Zap className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">Free</div>
                    <div className="text-[11px] text-muted-foreground">
                      Nemotron · no quota · free tier may log prompts
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
                  value="deep research panel"
                  onSelect={handleOpenResearch}
                  className="gap-2"
                >
                  <Microscope className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">Deep Research</div>
                    <div className="text-[11px] text-muted-foreground">
                      Run agent · Thinking model
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
            </CommandList>
          </Command>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
