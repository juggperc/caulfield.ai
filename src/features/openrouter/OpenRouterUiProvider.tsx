"use client";

import { readChatMode } from "@/features/ai-agent/storage";
import type { ChatModelsUiConfig } from "@/features/openrouter/chat-models-ui";
import { WorkspaceCommandPalette } from "@/features/openrouter/WorkspaceCommandPalette";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CHAT_MODE_LABEL_THINKING = "Thinking";
const CHAT_MODE_LABEL_FREE = "Free";
const CHAT_MODE_LABEL_FREEFAST = "Free (Fast)";
const CHAT_MODE_LABEL_MAX = "Max";

export type { ChatModelsUiConfig } from "@/features/openrouter/chat-models-ui";

export type KnowledgeTab = "snippets" | "memory";

type OpenRouterUiContextValue = {
  readonly openWorkspacePalette: () => void;
  readonly getChatModeShortLabel: () => string;
  readonly selectionEpoch: number;
  readonly knowledgeOpen: boolean;
  readonly setKnowledgeOpen: (open: boolean) => void;
  readonly knowledgeTab: KnowledgeTab;
  readonly setKnowledgeTab: (tab: KnowledgeTab) => void;
  readonly openKnowledgeSnippets: () => void;
  readonly openKnowledgeMemory: () => void;
  readonly setResearchDialogOpen: (open: boolean) => void;
  readonly setMemoryDialogOpen: (open: boolean) => void;
  readonly chatModels: ChatModelsUiConfig;
};

const OpenRouterUiContext = createContext<OpenRouterUiContextValue | null>(null);

export const useOpenRouterUi = (): OpenRouterUiContextValue => {
  const ctx = useContext(OpenRouterUiContext);
  if (!ctx) {
    throw new Error("useOpenRouterUi must be used within OpenRouterUiProvider");
  }
  return ctx;
};

export const OpenRouterUiProvider = ({ children }: { readonly children: ReactNode }) => {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [knowledgeTab, setKnowledgeTab] = useState<KnowledgeTab>("snippets");
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const [chatModels] = useState<ChatModelsUiConfig>({
    thinkingLabel: CHAT_MODE_LABEL_THINKING,
    freeLabel: CHAT_MODE_LABEL_FREE,
    freeFastLabel: CHAT_MODE_LABEL_FREEFAST,
    maxLabel: CHAT_MODE_LABEL_MAX,
    loaded: true,
  });

  const openWorkspacePalette = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  const onWorkspaceUpdated = useCallback(() => {
    setSelectionEpoch((n) => n + 1);
  }, []);

  const openKnowledgeSnippets = useCallback(() => {
    setKnowledgeTab("snippets");
    setKnowledgeOpen(true);
  }, []);

  const openKnowledgeMemory = useCallback(() => {
    setKnowledgeTab("memory");
    setKnowledgeOpen(true);
  }, []);

  const setResearchDialogOpen = useCallback((open: boolean) => {
    if (open) setKnowledgeTab("snippets");
    setKnowledgeOpen(open);
  }, []);

  const setMemoryDialogOpen = useCallback((open: boolean) => {
    if (open) setKnowledgeTab("memory");
    setKnowledgeOpen(open);
  }, []);

  const getChatModeShortLabel = useCallback((): string => {
    void selectionEpoch;
    const mode = readChatMode();
    switch (mode) {
      case "free":
        return CHAT_MODE_LABEL_FREE;
      case "freeFast":
        return CHAT_MODE_LABEL_FREEFAST;
      case "max":
        return CHAT_MODE_LABEL_MAX;
      default:
        return CHAT_MODE_LABEL_THINKING;
    }
  }, [selectionEpoch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      if (e.repeat) return;
      const el = e.target;
      if (el instanceof HTMLElement && el.isContentEditable) return;
      e.preventDefault();
      setPaletteOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({
      openWorkspacePalette,
      getChatModeShortLabel,
      selectionEpoch,
      knowledgeOpen,
      setKnowledgeOpen,
      knowledgeTab,
      setKnowledgeTab,
      openKnowledgeSnippets,
      openKnowledgeMemory,
      setResearchDialogOpen,
      setMemoryDialogOpen,
      chatModels,
    }),
    [
      openWorkspacePalette,
      getChatModeShortLabel,
      selectionEpoch,
      knowledgeOpen,
      knowledgeTab,
      openKnowledgeSnippets,
      openKnowledgeMemory,
      setResearchDialogOpen,
      setMemoryDialogOpen,
      chatModels,
    ],
  );

  return (
    <OpenRouterUiContext.Provider value={value}>
      {children}
      <WorkspaceCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onWorkspaceUpdated={onWorkspaceUpdated}
        onOpenResearch={openKnowledgeSnippets}
        onOpenMemory={openKnowledgeMemory}
        chatModels={chatModels}
      />
    </OpenRouterUiContext.Provider>
  );
};
