"use client";

import { readOpenRouterModel } from "@/features/ai-agent/storage";
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
  const { openModelPicker, getModelLabel, selectionEpoch } = useOpenRouterUi();
  const modelId = useMemo(() => {
    void selectionEpoch;
    return readOpenRouterModel();
  }, [selectionEpoch]);

  const label = getModelLabel("chat", modelId);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => openModelPicker("chat")}
      className={cn(
        "inline-flex max-w-[10.5rem] items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      aria-label={`Chat model: ${modelId || "not set"}. Click to change.`}
      title={modelId || "Choose chat model"}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
    </button>
  );
};
