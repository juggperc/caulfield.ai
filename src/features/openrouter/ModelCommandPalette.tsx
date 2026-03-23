"use client";

import { BrandIcon } from "@/components/BrandIcon";
import {
  Command,
  CommandEmpty,
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
  writeOpenRouterEmbeddingModel,
  writeOpenRouterModel,
} from "@/features/ai-agent/storage";
import type { NormalizedOpenRouterModel } from "@/lib/openrouter/model-types";
import { resolveProviderIcon } from "@/lib/openrouter/provider-icons";
import { cn } from "@/lib/utils";
import { Cpu, Search } from "lucide-react";
import { useCallback, useMemo } from "react";

type ModelKind = "chat" | "embedding";

type PaletteProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly kind: ModelKind;
  readonly chatPayload: ModelsPayload | null;
  readonly embeddingPayload: ModelsPayload | null;
  readonly catalogReady: boolean;
  readonly fetchError: string | null;
  readonly onModelChosen: () => void;
};

type ModelsPayload = {
  readonly models: NormalizedOpenRouterModel[];
  readonly popular: NormalizedOpenRouterModel[];
  readonly rest: NormalizedOpenRouterModel[];
};

const ProviderGlyph = ({
  providerSlug,
  className,
}: {
  readonly providerSlug: string;
  readonly className?: string;
}) => {
  const resolved = resolveProviderIcon(providerSlug);
  if (resolved.kind === "brand") {
    return (
      <BrandIcon
        icon={resolved.source}
        size={18}
        className={cn("shrink-0", className)}
      />
    );
  }
  return (
    <Cpu
      className={cn("size-[18px] shrink-0 text-muted-foreground", className)}
      aria-hidden
    />
  );
};

const renderRows = (
  items: NormalizedOpenRouterModel[],
  onPick: (id: string) => void,
) =>
  items.map((m) => (
    <CommandItem
      key={m.id}
      value={`${m.name} ${m.id}`}
      onSelect={() => onPick(m.id)}
      className="gap-2"
    >
      <ProviderGlyph providerSlug={m.providerSlug} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">{m.name}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">
          {m.id}
        </div>
      </div>
    </CommandItem>
  ));

export const ModelCommandPalette = ({
  open,
  onOpenChange,
  kind,
  chatPayload,
  embeddingPayload,
  catalogReady,
  fetchError,
  onModelChosen,
}: PaletteProps) => {
  const payload = kind === "chat" ? chatPayload : embeddingPayload;

  const handlePick = useCallback(
    (id: string) => {
      if (kind === "chat") {
        writeOpenRouterModel(id);
      } else {
        writeOpenRouterEmbeddingModel(id);
      }
      onModelChosen();
      onOpenChange(false);
    },
    [kind, onModelChosen, onOpenChange],
  );

  const title = kind === "chat" ? "Chat model" : "Embedding model";
  const description =
    kind === "chat"
      ? "Search OpenRouter chat models. IDs match the live OpenRouter catalog."
      : "Search OpenRouter embedding models for RAG.";

  const hasGroups = useMemo(() => {
    if (!payload) return false;
    return payload.popular.length > 0 || payload.rest.length > 0;
  }, [payload]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg"
        showClose
      >
        <DialogHeader className="border-b border-border px-4 pb-3 pt-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="p-0">
          {!catalogReady ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading models…
            </p>
          ) : fetchError && !payload ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {fetchError}
            </p>
          ) : !payload ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No catalog data.
            </p>
          ) : (
            <Command className="rounded-none border-0 bg-transparent shadow-none">
              <CommandInputWrap>
                <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <CommandInput placeholder="Search by name or id…" />
              </CommandInputWrap>
              <CommandList>
                {!hasGroups ? (
                  <CommandEmpty>No models available.</CommandEmpty>
                ) : (
                  <>
                    {payload.popular.length > 0 ? (
                      <CommandGroup heading="Popular">
                        {renderRows(payload.popular, handlePick)}
                      </CommandGroup>
                    ) : null}
                    {payload.popular.length > 0 && payload.rest.length > 0 ? (
                      <CommandSeparator />
                    ) : null}
                    {payload.rest.length > 0 ? (
                      <CommandGroup heading="All models">
                        {renderRows(payload.rest, handlePick)}
                      </CommandGroup>
                    ) : null}
                  </>
                )}
              </CommandList>
            </Command>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
