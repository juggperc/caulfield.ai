"use client";

import { useOpenRouterUi } from "@/features/openrouter/OpenRouterUiProvider";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useMemo } from "react";

export const ModelChipButton = ({
  disabled,
  className,
}: {
  readonly disabled?: boolean;
  readonly className?: string;
}) => {
  const { openWorkspacePalette, getChatModeShortLabel, selectionEpoch } =
    useOpenRouterUi();

  const label = useMemo(() => {
    void selectionEpoch;
    return getChatModeShortLabel();
  }, [selectionEpoch, getChatModeShortLabel]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => openWorkspacePalette()}
      className={cn(
        "inline-flex max-w-[10.5rem] items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      aria-label={`Chat mode: ${label}. Click to change.`}
      title={`${label} · ⌘K`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
    </button>
  );
};
