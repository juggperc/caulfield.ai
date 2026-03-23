"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";
import type { AppPanel } from "@/features/shell/panel";
import { motion } from "framer-motion";
import {
  FileText,
  LayoutGrid,
  LibraryBig,
  LogIn,
  LogOut,
  MessageSquare,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const SIDEBAR_WIDTH = "18rem";

type SidebarProps = {
  readonly activePanel: AppPanel;
  readonly onPanelChange: (panel: AppPanel) => void;
};

type QuotaJson = {
  freeRemaining: number;
  paidRemaining: number;
  subscribed: boolean;
};

export const Sidebar = ({ activePanel, onPanelChange }: SidebarProps) => {
  const { user, status, signIn, signOut } = useSession();
  const [quota, setQuota] = useState<QuotaJson | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void fetch("/api/billing/quota", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setQuota(j as QuotaJson);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const displayQuota = user?.id ? quota : null;

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
      <div className="mt-auto shrink-0 space-y-3 border-t border-sidebar-border p-3">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          {status === "loading" ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : user ? (
            <div className="flex flex-col gap-2">
              <p className="truncate text-xs text-foreground">
                {user.email ?? user.id}
              </p>
              {displayQuota ? (
                <p className="text-[11px] text-muted-foreground">
                  {displayQuota.subscribed
                    ? `${displayQuota.paidRemaining} queries left this period`
                    : `${displayQuota.freeRemaining} free queries left`}
                </p>
              ) : null}
              {!displayQuota?.subscribed &&
              displayQuota &&
              displayQuota.freeRemaining === 0 ? (
                <Link
                  href="/api/billing/checkout"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "inline-flex w-full justify-center",
                  )}
                >
                  Subscribe
                </Link>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={signOut}
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={signIn}
            >
              <LogIn className="size-4" aria-hidden />
              Sign in
            </Button>
          )}
        </div>
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Appearance
          </p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
};

export const MAIN_OFFSET_CLASS = "pl-72";
