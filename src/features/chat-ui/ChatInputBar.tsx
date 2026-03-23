"use client";

import { DictationMicButton } from "@/components/DictationMicButton";
import { Button } from "@/components/ui/button";
import {
  clearPendingChatInput,
  peekPendingChatInput,
} from "@/features/ai-context-menu/ai-pending-prompts";
import type { ChatStatus } from "ai";
import { ArrowUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SettingsPopover } from "./SettingsPopover";
import { ToolPalette } from "./ToolPalette";

type ChatInputBarProps = {
  readonly status: ChatStatus;
  readonly onSend: (text: string) => Promise<void>;
  readonly onStop: () => Promise<void>;
  readonly onClear: () => void;
  readonly disableClear: boolean;
};

export const ChatInputBar = ({
  status,
  onSend,
  onStop,
  onClear,
  disableClear,
}: ChatInputBarProps) => {
  const initialInput = useMemo(() => {
    const pending = peekPendingChatInput();
    if (!pending) return { text: "", focus: false };
    return { text: pending.text, focus: pending.focus };
  }, []);
  const [input, setInput] = useState(initialInput.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = status === "submitted" || status === "streaming";

  useLayoutEffect(() => {
    clearPendingChatInput();
    if (!initialInput.focus) return;
    textareaRef.current?.focus();
  }, [initialInput.focus]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const submitMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    setInput("");
    await onSend(trimmed);
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
    <div className="shrink-0 border-t border-border bg-background/95 px-3 pb-3 pt-2 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl rounded-xl border border-border bg-card shadow-sm"
      >
        <ToolPalette
          onClear={onClear}
          onStop={() => void onStop()}
          isStreaming={status === "streaming"}
          disableClear={disableClear}
        />
        <div className="flex items-end gap-2 px-2 pb-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[0.9375rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Message input"
          />
          <div className="flex shrink-0 items-center gap-0.5 pb-1.5">
            <DictationMicButton
              onAppendFinal={handleAppendDictation}
              disabled={isBusy}
              ariaLabelIdle="Dictate message"
              ariaLabelActive="Stop dictation"
            />
            <SettingsPopover />
            <Button
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={isBusy || !input.trim()}
              aria-label="Send message"
            >
              <ArrowUp className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
