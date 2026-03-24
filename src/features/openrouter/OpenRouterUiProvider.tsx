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

export type { ChatModelsUiConfig } from "@/features/openrouter/chat-models-ui";

type OpenRouterUiContextValue = {
  readonly openWorkspacePalette: () => void;
  readonly getChatModeShortLabel: () => string;
  readonly selectionEpoch: number;
  readonly researchDialogOpen: boolean;
  readonly setResearchDialogOpen: (open: boolean) => void;
  readonly memoryDialogOpen: boolean;
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
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const [chatModels] = useState<ChatModelsUiConfig>({
    thinkingLabel: CHAT_MODE_LABEL_THINKING,
    freeLabel: CHAT_MODE_LABEL_FREE,
    loaded: true,
  });

  const openWorkspacePalette = useCallback(() => {
    setPaletteOpen(true);
  }, []);

  const onWorkspaceUpdated = useCallback(() => {
    setSelectionEpoch((n) => n + 1);
  }, []);

  const getChatModeShortLabel = useCallback((): string => {
    void selectionEpoch;
    const mode = readChatMode();
    return mode === "free" ? CHAT_MODE_LABEL_FREE : CHAT_MODE_LABEL_THINKING;
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
      researchDialogOpen,
      setResearchDialogOpen,
      memoryDialogOpen,
      setMemoryDialogOpen,
      chatModels,
    }),
    [
      openWorkspacePalette,
      getChatModeShortLabel,
      selectionEpoch,
      researchDialogOpen,
      memoryDialogOpen,
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
        onOpenResearch={() => setResearchDialogOpen(true)}
        onOpenMemory={() => setMemoryDialogOpen(true)}
        chatModels={chatModels}
      />
    </OpenRouterUiContext.Provider>
  );
};
