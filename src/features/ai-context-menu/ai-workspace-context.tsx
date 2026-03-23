"use client";

import type { AppPanel } from "@/features/shell/panel";
import { createContext, useContext, type ReactNode } from "react";

type AiWorkspaceContextValue = {
  readonly panel: AppPanel;
  readonly onPanelChange: (panel: AppPanel) => void;
};

const AiWorkspaceContext = createContext<AiWorkspaceContextValue | null>(
  null,
);

type AiWorkspaceProviderProps = {
  readonly panel: AppPanel;
  readonly onPanelChange: (panel: AppPanel) => void;
  readonly children: ReactNode;
};

export const AiWorkspaceProvider = ({
  panel,
  onPanelChange,
  children,
}: AiWorkspaceProviderProps) => (
  <AiWorkspaceContext.Provider value={{ panel, onPanelChange }}>
    {children}
  </AiWorkspaceContext.Provider>
);

export const useAiWorkspace = (): AiWorkspaceContextValue => {
  const ctx = useContext(AiWorkspaceContext);
  if (!ctx) {
    throw new Error("useAiWorkspace must be used within AiWorkspaceProvider");
  }
  return ctx;
};
