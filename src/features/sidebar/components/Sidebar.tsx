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
  Settings,
  Store,
  Plus,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
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
  const [conversations, setConversations] = useState<{ id: string; title: string }[]>([]);
  const [dbConfigured, setDbConfigured] = useState(false);

  useEffect(() => {
    void fetch("/api/config")
      .then((r) => r.json())
      .then((j: { databaseConfigured?: boolean }) =>
        setDbConfigured(Boolean(j.databaseConfigured)),
      )
      .catch(() => {});
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user?.id || !dbConfigured) return;
    try {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }, [user?.id, dbConfigured]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

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
          <div className="flex flex-1 items-center justify-between">
            <span>Chat</span>
            {user?.id && dbConfigured && activePanel === "chat" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Dispatch custom event that ChatShell could optionally listen to 
                  // or let ChatShell manage new chats (we'll just reset URL/state eventually)
                  window.dispatchEvent(new CustomEvent("caulfield:new-chat"));
                }}
                className="rounded hover:bg-sidebar/50 p-0.5"
                title="New chat"
              >
                <Plus className="size-3.5 opacity-70" />
              </button>
            ) : null}
          </div>
        </motion.button>
        {user?.id && dbConfigured && conversations.length > 0 && activePanel === "chat" ? (
          <div className="mb-2 pl-6 pr-2">
            <div className="mt-1 flex flex-col gap-0.5 border-l border-sidebar-border/50 pl-2">
              {conversations.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground truncate"
                  title={c.title}
                  onClick={() => {
                    // ChatShell needs to update its active instance.
                    // Emitting event to set the active conversation.
                    window.dispatchEvent(
                      new CustomEvent("caulfield:load-chat", { detail: { id: c.id } })
                    );
                  }}
                >
                  <MessageCircle className="size-3 shrink-0 opacity-50" />
                  <span className="truncate">{c.title || "New chat"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
          <motion.button
            type="button"
            className={
              activePanel === "settings"
                ? "mb-4 flex w-full items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left text-sm font-medium text-sidebar-foreground"
                : "mb-4 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            aria-current={activePanel === "settings" ? "page" : undefined}
            onClick={() => onPanelChange("settings")}
          >
            <Settings className="size-4 shrink-0 opacity-70" aria-hidden />
            Settings
          </motion.button>
          {status === "loading" ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : user ? (
            <div className="flex flex-col gap-2">
              <p className="truncate text-xs text-foreground">
                {user.name ?? user.email ?? user.id}
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
                <a
                  href="/api/billing/checkout"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "inline-flex w-full justify-center",
                  )}
                >
                  Subscribe
                </a>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={() => {
                  void signOut();
                }}
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
