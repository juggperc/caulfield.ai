"use client";

import { DictationMicButton } from "@/components/DictationMicButton";
import { Button } from "@/components/ui/button";
import { readChatMode } from "@/features/ai-agent/storage";
import { useOpenRouterUi } from "@/features/openrouter/OpenRouterUiProvider";
import {
 clearPendingChatInput,
 peekPendingChatInput,
} from "@/features/ai-context-menu/ai-pending-prompts";
import { saveChatInput, loadChatInput } from "@/features/chat-ui/chat-input-store";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "ai";
import { ArrowUp, Loader2, X } from "lucide-react";
import {
 useCallback,
 useEffect,
 useLayoutEffect,
 useMemo,
 useRef,
 useState,
} from "react";
import { ChatResearchMemoryDialogs } from "./ChatResearchMemoryDialogs";
import { ModelChipButton } from "./ModelChipButton";
import { SettingsPopover } from "./SettingsPopover";
import { ToolPalette } from "./ToolPalette";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES = 4;

type ChatInputBarProps = {
 readonly status: ChatStatus;
 readonly convId: string | null;
 readonly onSend: (text: string, files?: File[]) => Promise<void>;
 readonly onStop: () => Promise<void>;
 readonly onClear: () => void;
 readonly disableClear: boolean;
 readonly webSearchEnabled: boolean;
 readonly onToggleWebSearch: () => void;
 readonly deepResearchEnabled: boolean;
 readonly onToggleDeepResearch: () => void;
};

export const ChatInputBar = ({
 status,
 convId,
 onSend,
 onStop,
 onClear,
 disableClear,
 webSearchEnabled,
 onToggleWebSearch,
 deepResearchEnabled,
 onToggleDeepResearch,
}: ChatInputBarProps) => {
 const initialInput = useMemo(() => {
 const pending = peekPendingChatInput();
 if (pending) return { text: pending.text, focus: false };
 if (convId) {
  const restored = loadChatInput(convId);
  if (restored) return { text: restored, focus: false };
 }
 return { text: "", focus: false };
 }, [convId]);
 const [input, setInput] = useState(initialInput.text);
 const [pendingFiles, setPendingFiles] = useState<File[]>([]);
 const textareaRef = useRef<HTMLTextAreaElement>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const { selectionEpoch } = useOpenRouterUi();

  const isBusy = status === "submitted" || status === "streaming";
  void selectionEpoch;
  const chatMode = readChatMode();
  const filesActive = chatMode !== "free";
  const attachDisabled =
    isBusy || chatMode === "free" || pendingFiles.length >= MAX_IMAGES;
  const attachTitle =
    chatMode === "free"
      ? "Images require Thinking mode (free model has no vision)"
      : pendingFiles.length >= MAX_IMAGES
        ? `At most ${MAX_IMAGES} images`
        : "Attach image";

useLayoutEffect(() => {
 clearPendingChatInput();
 if (!initialInput.focus) return;
 textareaRef.current?.focus();
 }, [initialInput.focus]);

 useEffect(() => {
 if (convId) {
  saveChatInput(convId, input);
 }
 }, [convId, input]);

 useEffect(() => {
 const el = textareaRef.current;
 if (!el) return;
 el.style.height = "auto";
 el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
 }, [input]);

  const handleAttachClick = useCallback(() => {
    if (readChatMode() === "free") return;
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length) return;
      const next: File[] = [...pendingFiles];
      for (const f of Array.from(list)) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > MAX_IMAGE_BYTES) continue;
        if (next.length >= MAX_IMAGES) break;
        next.push(f);
      }
      setPendingFiles(next);
      e.target.value = "";
    },
    [pendingFiles],
  );

  const removePendingAt = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canSend = Boolean(
    input.trim() || (filesActive && pendingFiles.length > 0),
  );

const submitMessage = async () => {
 if (!canSend || isBusy) return;
 const trimmed = input.trim();
 const files =
  filesActive && pendingFiles.length > 0 ? [...pendingFiles] : undefined;
 setInput("");
 setPendingFiles([]);
 if (convId) {
  saveChatInput(convId, "");
 }
 await onSend(trimmed, files);
 };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    void submitMessage();
  };

  const handleAppendDictation = useCallback((text: string) => {
    setInput((prev) => {
      const sep = prev.length > 0 && !/\s$/.test(prev) ? " " : "";
      return `${prev}${sep}${text}`;
    });
  }, []);

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-background/95 px-3 pt-2 backdrop-blur-md",
        "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20",
        "max-md:border-border max-md:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] max-md:pt-2 max-md:shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.12)]",
        "dark:max-md:shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.45)]",
        "md:relative md:z-auto md:pb-3 md:shadow-none",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl rounded-xl border border-border bg-card shadow-sm"
      >
        <ToolPalette
          onClear={onClear}
          onStop={() => void onStop()}
          isStreaming={status === "streaming"}
          disableClear={disableClear}
          onAttachClick={handleAttachClick}
          attachDisabled={attachDisabled}
          attachTitle={attachTitle}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={onToggleWebSearch}
          deepResearchEnabled={deepResearchEnabled}
          onToggleDeepResearch={onToggleDeepResearch}
        />
        {filesActive && pendingFiles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-2 py-2">
            {pendingFiles.map((f, i) => (
              <div
                key={`${f.name}-${i}-${f.size}`}
                className="group relative inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 py-1 pl-2 pr-7 text-[11px] text-foreground"
              >
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => removePendingAt(i)}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2 px-2 pb-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Message input"
          />
          <div className="flex shrink-0 items-center gap-0.5 pb-1.5">
            <DictationMicButton
              onAppendFinal={handleAppendDictation}
              disabled={isBusy}
              ariaLabelIdle="Dictate message"
              ariaLabelActive="Stop dictation"
            />
            <ChatResearchMemoryDialogs />
            <ModelChipButton disabled={isBusy} />
            <SettingsPopover />
            <Button
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={isBusy|| !canSend}
              aria-label="Send message"
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ArrowUp className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
