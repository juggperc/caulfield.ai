"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  STORAGE_KEYS,
  readOpenRouterEmbeddingModel,
  readOpenRouterKey,
  readOpenRouterModel,
} from "@/features/ai-agent/storage";
import { DEFAULT_EMBEDDING_MODEL } from "@/features/notes/constants";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useState } from "react";

export const SettingsPopover = () => {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setApiKey(v);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.openRouterKey, v);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setModelId(v);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.openRouterModel, v);
    }
  };

  const handleEmbeddingModelChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const v = e.target.value;
    setEmbeddingModel(v);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.openRouterEmbeddingModel, v);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setApiKey(readOpenRouterKey());
      setModelId(readOpenRouterModel());
      setEmbeddingModel(readOpenRouterEmbeddingModel());
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <motion.div
        className="inline-flex"
        whileHover={{ opacity: 0.85 }}
        whileTap={{ scale: 0.97 }}
      >
        <PopoverTrigger
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-muted-foreground",
          )}
          aria-label="Open settings"
        >
          <Settings className="size-4" aria-hidden />
        </PopoverTrigger>
      </motion.div>
      <PopoverContent
        align="end"
        side="top"
        className="w-80 gap-3 p-3"
        sideOffset={8}
      >
        <PopoverHeader>
          <PopoverTitle>Settings</PopoverTitle>
        </PopoverHeader>
        <div className="flex max-h-[min(70vh,420px)] flex-col gap-3 overflow-y-auto pr-0.5">
          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-2.5">
            <Label className="text-xs text-muted-foreground">Theme</Label>
            <ThemeToggle compact />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
            <Input
              id="openrouter-key"
              type="password"
              autoComplete="off"
              placeholder="sk-or-…"
              value={apiKey}
              onChange={handleApiKeyChange}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="openrouter-model">OpenRouter Model ID</Label>
            <Input
              id="openrouter-model"
              type="text"
              autoComplete="off"
              placeholder="anthropic/claude-3.5-sonnet"
              value={modelId}
              onChange={handleModelChange}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="openrouter-embedding">
              Embedding model (RAG / notes)
            </Label>
            <Input
              id="openrouter-embedding"
              type="text"
              autoComplete="off"
              placeholder={DEFAULT_EMBEDDING_MODEL}
              value={embeddingModel}
              onChange={handleEmbeddingModelChange}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Used to retrieve relevant note excerpts for chat. Must be an
              OpenRouter embedding model id.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
