"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  STORAGE_KEYS,
  readChatRagMemoryEnabled,
  readChatRagResearchEnabled,
  readOpenRouterEmbeddingModel,
  readOpenRouterKey,
  readOpenRouterModel,
  writeOpenRouterEmbeddingModel,
  writeOpenRouterKey,
  writeOpenRouterModel,
} from "@/features/ai-agent/storage";
import { useOpenRouterUi } from "@/features/openrouter/OpenRouterUiProvider";
import { DEFAULT_EMBEDDING_MODEL } from "@/features/notes/constants";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronDown, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PublicConfig = {
  hostedOpenRouter: boolean;
};

const SettingsSection = ({
  label,
  children,
}: {
  readonly label?: string;
  readonly children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/15 p-3">
    {label ? (
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    ) : null}
    {children}
  </div>
);

export const SettingsDialog = () => {
  const { openModelPicker, getModelLabel, selectionEpoch } = useOpenRouterUi();
  const [open, setOpen] = useState(false);
  const [hosted, setHosted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [ragMemoryOn, setRagMemoryOn] = useState(true);
  const [ragResearchOn, setRagResearchOn] = useState(true);
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [showCustomEmbedding, setShowCustomEmbedding] = useState(false);

  const syncFromStorage = useCallback(() => {
    setApiKey(readOpenRouterKey());
    setModelId(readOpenRouterModel());
    setEmbeddingModel(readOpenRouterEmbeddingModel());
    setRagMemoryOn(readChatRagMemoryEnabled());
    setRagResearchOn(readChatRagResearchEnabled());
  }, []);

  const handleDialogOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    syncFromStorage();
    void fetch("/api/config", { credentials: "include" })
      .then((r) => r.json() as Promise<PublicConfig>)
      .then((c) => setHosted(Boolean(c.hostedOpenRouter)))
      .catch(() => setHosted(false));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setApiKey(v);
    writeOpenRouterKey(v);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setModelId(v);
    writeOpenRouterModel(v);
  };

  const handleEmbeddingModelChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const v = e.target.value;
    setEmbeddingModel(v);
    writeOpenRouterEmbeddingModel(v);
  };

  const handleRagMemoryToggle = () => {
    const next = !ragMemoryOn;
    setRagMemoryOn(next);
    if (typeof window === "undefined") return;
    if (next) {
      localStorage.removeItem(STORAGE_KEYS.chatRagMemoryEnabled);
    } else {
      localStorage.setItem(STORAGE_KEYS.chatRagMemoryEnabled, "0");
    }
  };

  const handleRagResearchToggle = () => {
    const next = !ragResearchOn;
    setRagResearchOn(next);
    if (typeof window === "undefined") return;
    if (next) {
      localStorage.removeItem(STORAGE_KEYS.chatRagResearchEnabled);
    } else {
      localStorage.setItem(STORAGE_KEYS.chatRagResearchEnabled, "0");
    }
  };

  const handleRagMemoryKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleRagMemoryToggle();
  };

  const handleRagResearchKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    handleRagResearchToggle();
  };

  const chatLabel = getModelLabel("chat", modelId);
  const embedLabel = getModelLabel("embedding", embeddingModel);

  // Palette can change storage while this dialog stays open (e.g. ⌘K).
  /* eslint-disable react-hooks/set-state-in-effect -- sync form fields from localStorage */
  useEffect(() => {
    if (!open) return;
    syncFromStorage();
  }, [selectionEpoch, open, syncFromStorage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      <motion.div
        className="inline-flex"
        whileHover={{ opacity: 0.85 }}
        whileTap={{ scale: 0.97 }}
      >
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-muted-foreground",
          )}
          aria-label="Open settings"
          onClick={() => setOpen(true)}
        >
          <Settings className="size-4" aria-hidden />
        </button>
      </motion.div>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-h-[min(85vh,640px)] max-w-md gap-0 overflow-hidden p-0 sm:max-w-md"
          showClose
        >
          <DialogHeader className="border-b border-border px-4 pb-3 pt-4 pr-12">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription className="text-[0.8125rem] leading-snug">
              Theme, OpenRouter, models, and RAG. Press{" "}
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                ⌘K
              </kbd>{" "}
              /{" "}
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                Ctrl+K
              </kbd>{" "}
              to pick a chat model quickly.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3 px-4 py-3">
            <SettingsSection label="Appearance">
              <ThemeToggle compact />
            </SettingsSection>

            {!hosted ? (
              <SettingsSection label="OpenRouter API key">
                <Input
                  id="openrouter-key"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-or-…"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  className="font-mono text-sm"
                />
              </SettingsSection>
            ) : (
              <SettingsSection label="OpenRouter">
                <p className="text-[0.8125rem] leading-snug text-muted-foreground">
                  Hosted mode: the server supplies the API key. You can still
                  choose which model to use below.
                </p>
              </SettingsSection>
            )}

            <SettingsSection label="Chat model">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[0.9375rem] text-foreground">
                  {modelId ? (
                    <>
                      <span className="font-medium">{chatLabel}</span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                        {modelId}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">None selected</span>
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => openModelPicker("chat")}
                >
                  Browse
                  <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModel((v) => !v)}
                className="w-fit text-left text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {showCustomModel ? "Hide custom model ID" : "Custom model ID…"}
              </button>
              {showCustomModel ? (
                <Input
                  id="openrouter-model-custom"
                  type="text"
                  autoComplete="off"
                  placeholder="provider/model-id"
                  value={modelId}
                  onChange={handleModelChange}
                  className="font-mono text-sm"
                />
              ) : null}
            </SettingsSection>

            <SettingsSection label="Embedding model (RAG)">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[0.9375rem] text-foreground">
                  <span className="font-medium">{embedLabel}</span>
                  <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                    {embeddingModel || DEFAULT_EMBEDDING_MODEL}
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => openModelPicker("embedding")}
                >
                  Browse
                  <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomEmbedding((v) => !v)}
                className="w-fit text-left text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                {showCustomEmbedding
                  ? "Hide custom embedding ID"
                  : "Custom embedding ID…"}
              </button>
              {showCustomEmbedding ? (
                <div className="flex flex-col gap-1">
                  <Input
                    id="openrouter-embedding-custom"
                    type="text"
                    autoComplete="off"
                    placeholder={DEFAULT_EMBEDDING_MODEL}
                    value={embeddingModel}
                    onChange={handleEmbeddingModelChange}
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Must be an OpenRouter embedding model id.
                  </p>
                </div>
              ) : null}
            </SettingsSection>

            <SettingsSection label="Chat context">
              <p className="text-[11px] leading-snug text-muted-foreground">
                These toggles affect{" "}
                <strong className="font-medium text-foreground">
                  semantic RAG
                </strong>{" "}
                only. Full memory and research data are still sent so{" "}
                <code className="rounded bg-muted px-1 font-mono text-[10px]">
                  memory_*
                </code>{" "}
                tools work.
              </p>
              <div className="flex items-start justify-between gap-3">
                <Label
                  htmlFor="rag-memory-switch"
                  className="text-xs text-muted-foreground"
                >
                  Include memory in RAG
                </Label>
                <button
                  type="button"
                  id="rag-memory-switch"
                  role="switch"
                  aria-checked={ragMemoryOn}
                  aria-label="Include memory in semantic RAG"
                  tabIndex={0}
                  onClick={handleRagMemoryToggle}
                  onKeyDown={handleRagMemoryKeyDown}
                  className={cn(
                    "relative inline-flex h-7 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    ragMemoryOn ? "bg-primary" : "bg-background",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute top-0.5 left-0.5 block size-6 rounded-full bg-card shadow transition-transform",
                      ragMemoryOn ? "translate-x-[1.125rem]" : "translate-x-0",
                    )}
                    aria-hidden
                  />
                </button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <Label
                  htmlFor="rag-research-switch"
                  className="text-xs text-muted-foreground"
                >
                  Include research in RAG
                </Label>
                <button
                  type="button"
                  id="rag-research-switch"
                  role="switch"
                  aria-checked={ragResearchOn}
                  aria-label="Include Deep Research snippets in semantic RAG"
                  tabIndex={0}
                  onClick={handleRagResearchToggle}
                  onKeyDown={handleRagResearchKeyDown}
                  className={cn(
                    "relative inline-flex h-7 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    ragResearchOn ? "bg-primary" : "bg-background",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none absolute top-0.5 left-0.5 block size-6 rounded-full bg-card shadow transition-transform",
                      ragResearchOn ? "translate-x-[1.125rem]" : "translate-x-0",
                    )}
                    aria-hidden
                  />
                </button>
              </div>
            </SettingsSection>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};
