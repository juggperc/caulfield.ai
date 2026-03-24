"use client";

import { Button } from "@/components/ui/button";
import type { AppPanel } from "@/features/shell/panel";
import { Menu } from "lucide-react";

const PANEL_LABELS: Record<AppPanel, string> = {
  chat: "Chat",
  notes: "Notes",
  docs: "Docs",
  library: "Library",
  settings: "Settings",
};

type MobileWorkspaceBarProps = {
  readonly panel: AppPanel;
  readonly navOpen: boolean;
  readonly onOpenNav: () => void;
};

export const MobileWorkspaceBar = ({
  panel,
  navOpen,
  onOpenNav,
}: MobileWorkspaceBarProps) => {
  return (
    <header
      className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur-sm md:hidden"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={onOpenNav}
        aria-label="Open workspace menu"
        aria-expanded={navOpen}
        aria-controls="workspace-sidebar-nav"
      >
        <Menu className="size-5" aria-hidden />
      </Button>
      <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">
        {PANEL_LABELS[panel]}
      </h1>
    </header>
  );
};
