"use client";

import { Button } from "@/components/ui/button";
import { useSpeechDictation } from "@/hooks/use-speech-dictation";
import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";
import { useEffect } from "react";

type DictationMicButtonProps = {
  readonly onAppendFinal: (text: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly size?: "icon-xs" | "icon-sm";
  readonly ariaLabelIdle?: string;
  readonly ariaLabelActive?: string;
};

export const DictationMicButton = ({
  onAppendFinal,
  disabled = false,
  className,
  size = "icon-sm",
  ariaLabelIdle = "Start dictation",
  ariaLabelActive = "Stop dictation",
}: DictationMicButtonProps) => {
  const { supported, listening, interim, error, toggle, stop } =
    useSpeechDictation({ onAppendFinal });

  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);

  if (!supported) {
    return null;
  }

  const handleClick = () => {
    if (disabled) return;
    toggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleClick();
  };

  return (
    <div className="relative flex flex-col items-center">
      <Button
        type="button"
        variant="ghost"
        size={size}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-pressed={listening}
        aria-label={listening ? ariaLabelActive : ariaLabelIdle}
        title={
          error ??
          (listening
            ? "Stop dictation"
            : "Dictate with your microphone (Web Speech API)")
        }
        className={cn(
          listening && "text-destructive ring-2 ring-destructive/30",
          className,
        )}
      >
        <Mic className="size-4" aria-hidden />
      </Button>
      {listening && interim ? (
        <span
          className="pointer-events-none absolute -top-7 left-1/2 z-10 max-w-[min(240px,70vw)] -translate-x-1/2 truncate rounded border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm"
          aria-live="polite"
        >
          {interim}
        </span>
      ) : null}
      {error ? (
        <span className="sr-only" aria-live="assertive">
          {error}
        </span>
      ) : null}
    </div>
  );
};
