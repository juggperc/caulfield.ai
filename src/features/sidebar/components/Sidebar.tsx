"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import type { AppPanel } from "@/features/shell/panel";
import { motion } from "framer-motion";
import {
  Brain,
  FileText,
  LayoutGrid,
  LibraryBig,
  MessageSquare,
  Microscope,
  Store,
} from "lucide-react";
import { Logo } from "./Logo";

const SIDEBAR_WIDTH = "18rem";

type SidebarProps = {
  readonly activePanel: AppPanel;
  readonly onPanelChange: (panel: AppPanel) => void;
};

export const Sidebar = ({ activePanel, onPanelChange }: SidebarProps) => {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-sidebar"
      style={{ width: SIDEBAR_WIDTH }}
    >
      <Logo />
      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3"
        aria-label="Workspace"
      >
        <motion.button
          type="button"
          className={
            activePanel === "chat"
              ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
              : "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          aria-current={activePanel === "chat" ? "page" : undefined}
          aria-label="Chat"
          onClick={() => onPanelChange("chat")}
        >
          <MessageSquare className="size-4 shrink-0 opacity-70" aria-hidden />
          Chat
        </motion.button>
        <motion.button
          type="button"
          className={
            activePanel === "notes"
              ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
              : "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          aria-current={activePanel === "notes" ? "page" : undefined}
          aria-label="Notes"
          onClick={() => onPanelChange("notes")}
        >
          <FileText className="size-4 shrink-0 opacity-70" aria-hidden />
          Notes
        </motion.button>
        <motion.button
          type="button"
          className={
            activePanel === "docs"
              ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
              : "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          aria-current={activePanel === "docs" ? "page" : undefined}
          aria-label="Docs workspace"
          onClick={() => onPanelChange("docs")}
        >
          <LayoutGrid className="size-4 shrink-0 opacity-70" aria-hidden />
          Docs
        </motion.button>
        <motion.button
          type="button"
          className={
            activePanel === "library"
              ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
              : "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          aria-current={activePanel === "library" ? "page" : undefined}
          aria-label="Library"
          onClick={() => onPanelChange("library")}
        >
          <LibraryBig className="size-4 shrink-0 opacity-70" aria-hidden />
          Library
        </motion.button>
        <motion.button
          type="button"
          className={
            activePanel === "research"
              ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
              : "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          aria-current={activePanel === "research" ? "page" : undefined}
          aria-label="Deep Research"
          onClick={() => onPanelChange("research")}
        >
          <Microscope className="size-4 shrink-0 opacity-70" aria-hidden />
          Deep Research
        </motion.button>
        <motion.button
          type="button"
          className={
            activePanel === "memory"
              ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
              : "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          aria-current={activePanel === "memory" ? "page" : undefined}
          aria-label="Memory"
          onClick={() => onPanelChange("memory")}
        >
          <Brain className="size-4 shrink-0 opacity-70" aria-hidden />
          Memory
        </motion.button>
        <motion.button
          type="button"
          className={
            activePanel === "marketplace"
              ? "flex items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
              : "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          aria-current={activePanel === "marketplace" ? "page" : undefined}
          aria-label="Marketplace"
          onClick={() => onPanelChange("marketplace")}
        >
          <Store className="size-4 shrink-0 opacity-70" aria-hidden />
          Marketplace
        </motion.button>
      </nav>
      <div className="mt-auto shrink-0 border-t border-sidebar-border p-3">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Appearance
        </p>
        <ThemeToggle />
      </div>
    </aside>
  );
};

export const MAIN_OFFSET_CLASS = "pl-72";
