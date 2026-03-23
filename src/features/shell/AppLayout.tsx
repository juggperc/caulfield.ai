"use client";

import { AiWorkspaceProvider } from "@/features/ai-context-menu/ai-workspace-context";
import { GlobalContextMenuLayer } from "@/features/ai-context-menu/GlobalContextMenuLayer";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { SessionProvider } from "@/features/auth/session-context";
import { OpenRouterUiProvider } from "@/features/openrouter/OpenRouterUiProvider";
import { ChatShell } from "@/features/chat-ui/ChatShell";
import { DocsProvider } from "@/features/documents/docs-context";
import { DocsShell } from "@/features/documents/DocsShell";
import { SheetsProvider } from "@/features/documents/sheets-context";
import { LibraryProvider } from "@/features/library/library-context";
import { LibraryShell } from "@/features/library/LibraryShell";
import { MarketplaceShell } from "@/features/marketplace/MarketplaceShell";
import { MemoryProvider } from "@/features/memory/memory-provider";
import { NotesProvider } from "@/features/notes/notes-context";
import { NotesShell } from "@/features/notes/NotesShell";
import { ResearchProvider } from "@/features/research/research-provider";
import { AccountSettings } from "@/features/auth/AccountSettings";
import {
  MAIN_OFFSET_CLASS,
  Sidebar,
} from "@/features/sidebar/components/Sidebar";
import type { AppPanel } from "@/features/shell/panel";
import { MobileWorkspaceBar } from "@/features/shell/MobileWorkspaceBar";
import { WorkspaceLibrarySync } from "@/features/shell/WorkspaceLibrarySync";
import { WorkspaceSnapshotsRegistrar } from "@/features/shell/WorkspaceSnapshotsRegistrar";
import { useEffect, useState } from "react";

export const AppLayout = () => {
  const [panel, setPanel] = useState<AppPanel>("chat");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handlePanelChange = (next: AppPanel) => {
    setPanel(next);
    setMobileNavOpen(false);
  };

  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <SessionProvider>
      <RequireAuth>
        <OpenRouterUiProvider>
          <NotesProvider>
            <MemoryProvider>
              <ResearchProvider>
                <DocsProvider>
                  <SheetsProvider>
                    <LibraryProvider>
                      <WorkspaceSnapshotsRegistrar />
                      <WorkspaceLibrarySync />
                      <AiWorkspaceProvider
                        panel={panel}
                        onPanelChange={handlePanelChange}
                      >
                        <div className="flex min-h-screen min-h-[100dvh] bg-background text-foreground">
                          {mobileNavOpen ? (
                            <button
                              type="button"
                              className="fixed inset-0 z-40 bg-black/40 md:hidden"
                              aria-label="Close menu"
                              onClick={() => setMobileNavOpen(false)}
                            />
                          ) : null}
                          <Sidebar
                            activePanel={panel}
                            onPanelChange={handlePanelChange}
                            mobileNavOpen={mobileNavOpen}
                            onRequestClose={() => setMobileNavOpen(false)}
                          />
                          <div
                            className={`flex min-h-0 min-w-0 flex-1 flex-col ${MAIN_OFFSET_CLASS}`}
                          >
                            <MobileWorkspaceBar
                              panel={panel}
                              navOpen={mobileNavOpen}
                              onOpenNav={() => setMobileNavOpen(true)}
                            />
                            <main
                              data-ai-workspace
                              className="flex min-h-0 min-w-0 flex-1 flex-col"
                            >
                              {panel === "chat" ? (
                                <ChatShell />
                              ) : panel === "notes" ? (
                                <NotesShell />
                              ) : panel === "docs" ? (
                                <DocsShell />
                              ) : panel === "library" ? (
                                <LibraryShell />
                              ) : panel === "marketplace" ? (
                                <MarketplaceShell />
                              ) : (
                                <AccountSettings />
                              )}
                            </main>
                          </div>
                        </div>
                        <GlobalContextMenuLayer />
                      </AiWorkspaceProvider>
                    </LibraryProvider>
                  </SheetsProvider>
                </DocsProvider>
              </ResearchProvider>
            </MemoryProvider>
          </NotesProvider>
        </OpenRouterUiProvider>
      </RequireAuth>
    </SessionProvider>
  );
};
