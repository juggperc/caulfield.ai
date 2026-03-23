"use client";

import { AiWorkspaceProvider } from "@/features/ai-context-menu/ai-workspace-context";
import { GlobalContextMenuLayer } from "@/features/ai-context-menu/GlobalContextMenuLayer";
import { SessionProvider } from "@/features/auth/session-context";
import { ChatShell } from "@/features/chat-ui/ChatShell";
import { DocsProvider } from "@/features/documents/docs-context";
import { DocsShell } from "@/features/documents/DocsShell";
import { SheetsProvider } from "@/features/documents/sheets-context";
import { LibraryProvider } from "@/features/library/library-context";
import { LibraryShell } from "@/features/library/LibraryShell";
import { MarketplaceShell } from "@/features/marketplace/MarketplaceShell";
import { MemoryProvider } from "@/features/memory/memory-provider";
import { MemoryShell } from "@/features/memory/MemoryShell";
import { NotesProvider } from "@/features/notes/notes-context";
import { NotesShell } from "@/features/notes/NotesShell";
import { ResearchProvider } from "@/features/research/research-provider";
import { ResearchShell } from "@/features/research/ResearchShell";
import {
  MAIN_OFFSET_CLASS,
  Sidebar,
} from "@/features/sidebar/components/Sidebar";
import type { AppPanel } from "@/features/shell/panel";
import { WorkspaceLibrarySync } from "@/features/shell/WorkspaceLibrarySync";
import { WorkspaceSnapshotsRegistrar } from "@/features/shell/WorkspaceSnapshotsRegistrar";
import { useState } from "react";

export const AppLayout = () => {
  const [panel, setPanel] = useState<AppPanel>("chat");

  return (
    <SessionProvider>
      <NotesProvider>
        <MemoryProvider>
          <ResearchProvider>
            <DocsProvider>
              <SheetsProvider>
                <LibraryProvider>
                  <WorkspaceSnapshotsRegistrar />
                  <WorkspaceLibrarySync />
                  <AiWorkspaceProvider panel={panel} onPanelChange={setPanel}>
                    <div className="flex min-h-screen bg-background text-foreground">
                      <Sidebar activePanel={panel} onPanelChange={setPanel} />
                      <main
                        data-ai-workspace
                        className={`flex min-h-screen min-w-0 flex-1 flex-col ${MAIN_OFFSET_CLASS}`}
                      >
                        {panel === "chat" ? (
                          <ChatShell />
                        ) : panel === "notes" ? (
                          <NotesShell />
                        ) : panel === "docs" ? (
                          <DocsShell />
                        ) : panel === "library" ? (
                          <LibraryShell />
                        ) : panel === "research" ? (
                          <ResearchShell />
                        ) : panel === "memory" ? (
                          <MemoryShell />
                        ) : (
                          <MarketplaceShell />
                        )}
                      </main>
                    </div>
                    <GlobalContextMenuLayer />
                  </AiWorkspaceProvider>
                </LibraryProvider>
              </SheetsProvider>
            </DocsProvider>
          </ResearchProvider>
        </MemoryProvider>
      </NotesProvider>
    </SessionProvider>
  );
};
