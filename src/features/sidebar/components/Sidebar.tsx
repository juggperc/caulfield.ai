"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "./Logo";
import { UserAvatarGlow } from "./UserAvatarGlow";

const SIDEBAR_WIDTH = "18rem";

type SidebarProps = {
  readonly activePanel: AppPanel;
  readonly onPanelChange: (panel: AppPanel) => void;
  readonly mobileNavOpen: boolean;
  readonly onRequestClose: () => void;
};

type QuotaJson = {
  unlimited?: boolean;
  freeRemaining: number;
  paidRemaining: number;
  subscribed: boolean;
};

type PendingDelete = { id: string; title: string };

export const Sidebar = ({
  activePanel,
  onPanelChange,
  mobileNavOpen,
  onRequestClose,
}: SidebarProps) => {
  const { user, status, signIn, signOut } = useSession();
  const [quota, setQuota] = useState<QuotaJson | null>(null);
  const [conversations, setConversations] = useState<
    { id: string; title: string }[]
  >([]);
  const [dbConfigured, setDbConfigured] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
    const onActive = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (typeof id === "string" && id.length > 0) {
        setActiveConversationId(id);
      }
    };
    const onRefresh = () => {
      void loadConversations();
    };
    window.addEventListener("caulfield:active-conversation", onActive);
    window.addEventListener("caulfield:conversations-changed", onRefresh);
    return () => {
      window.removeEventListener("caulfield:active-conversation", onActive);
      window.removeEventListener("caulfield:conversations-changed", onRefresh);
    };
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
  const displayName = user
    ? (user.name ?? user.email ?? user.id)
    : "";

  const handleConfirmDeleteChat = useCallback(async () => {
    if (!pendingDelete) return;
    const removedId = pendingDelete.id;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/conversations/${removedId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        return;
      }
      setPendingDelete(null);
      window.dispatchEvent(new CustomEvent("caulfield:conversations-changed"));
      window.dispatchEvent(
        new CustomEvent("caulfield:conversation-deleted", {
          detail: { id: removedId },
        }),
      );
      void loadConversations();
    } finally {
      setDeleteBusy(false);
    }
  }, [pendingDelete, loadConversations]);

  return (
    <aside
      id="workspace-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-sidebar transition-transform duration-200 ease-out",
        "z-50 md:z-40",
        mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0",
        "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
      )}
      style={{ width: SIDEBAR_WIDTH }}
    >
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-sm" showClose>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `“${pendingDelete.title || "New chat"}” will be removed permanently. This cannot be undone.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-2 px-4 pb-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              onClick={() => setPendingDelete(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="sm:w-auto"
              disabled={deleteBusy}
              onClick={() => void handleConfirmDeleteChat()}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Logo />
      <nav
        id="workspace-sidebar-nav"
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
                  window.dispatchEvent(new CustomEvent("caulfield:new-chat"));
                }}
                className="rounded p-0.5 hover:bg-sidebar/50"
                title="New chat"
                aria-label="New chat"
              >
                <Plus className="size-3.5 opacity-70" aria-hidden />
              </button>
            ) : null}
          </div>
        </motion.button>
        {user?.id && dbConfigured && conversations.length > 0 && activePanel === "chat" ? (
          <div className="mb-2 pl-6 pr-2">
            <div className="mt-1 flex flex-col gap-0.5 border-l border-sidebar-border/50 pl-2">
              {conversations.slice(0, 10).map((c) => {
                const active = c.id === activeConversationId;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-stretch gap-0.5 rounded-md",
                      active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/80",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                        active
                          ? "font-medium text-sidebar-foreground"
                          : "text-muted-foreground hover:text-sidebar-foreground",
                      )}
                      title={c.title}
                      aria-current={active ? "true" : undefined}
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("caulfield:load-chat", {
                            detail: { id: c.id },
                          }),
                        );
                      }}
                    >
                      <MessageCircle
                        className={cn(
                          "size-3 shrink-0",
                          active ? "opacity-80" : "opacity-50",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{c.title || "New chat"}</span>
                    </button>
                    <button
                      type="button"
                      className="flex shrink-0 items-center rounded-md px-1.5 text-muted-foreground opacity-70 hover:bg-sidebar/60 hover:text-destructive hover:opacity-100"
                      aria-label={`Delete chat ${c.title || "New chat"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete({
                          id: c.id,
                          title: c.title || "New chat",
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                );
              })}
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

      <div className="mt-auto shrink-0 space-y-2 border-t border-sidebar-border p-3">
        <div className="rounded-xl border border-border/80 bg-card/40 p-3 dark:bg-card/25">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          {status === "loading" ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : user ? (
            <>
              <div className="flex items-start gap-3">
                <UserAvatarGlow userId={user.id} label={displayName} />
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  {displayQuota ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {displayQuota.unlimited
                        ? "Unlimited queries"
                        : displayQuota.subscribed
                          ? `${displayQuota.paidRemaining} queries left this period`
                          : `${displayQuota.freeRemaining} free queries left`}
                    </p>
                  ) : null}
                </div>
              </div>
              {!displayQuota?.unlimited &&
              !displayQuota?.subscribed &&
              displayQuota &&
              displayQuota.freeRemaining === 0 ? (
                <a
                  href="/api/billing/checkout"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-3 inline-flex w-full justify-center",
                  )}
                >
                  Subscribe
                </a>
              ) : null}
              <div className="my-3 border-t border-border/60" />
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  activePanel === "settings"
                    ? "bg-sidebar-accent font-medium text-sidebar-foreground"
                    : "text-foreground hover:bg-sidebar-accent/70",
                )}
                aria-current={activePanel === "settings" ? "page" : undefined}
                onClick={() => onPanelChange("settings")}
              >
                <Settings className="size-4 shrink-0 opacity-70" aria-hidden />
                Settings
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-sidebar-accent/70"
                onClick={() => {
                  onRequestClose();
                  void signOut();
                }}
              >
                <LogOut className="size-4 shrink-0 opacity-70" aria-hidden />
                Sign out
              </button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                onRequestClose();
                signIn();
              }}
            >
              <LogIn className="size-4" aria-hidden />
              Sign in
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border/80 bg-card/40 p-3 dark:bg-card/25">
          <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Appearance
          </p>
          <ThemeToggle variant="segmented" />
        </div>
      </div>
    </aside>
  );
};

export const MAIN_OFFSET_CLASS = "pl-0 md:pl-72";
