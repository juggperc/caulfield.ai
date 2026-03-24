"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session-context";
import {
  readLastServerConversationId,
  writeLastServerConversationId,
} from "@/features/auth/storage-scope";
import { useChatWithOpenRouter } from "@/features/ai-agent/useChatWithOpenRouter";
import type { MemoryEntry } from "@/features/memory/memory-types";
import { useMemory } from "@/features/memory/memory-provider";
import { useNotes } from "@/features/notes/notes-context";
import type { Note } from "@/features/notes/types";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getOrCreateLocalConversationId,
  loadConversationMessages,
  setLocalActiveConversationId,
  upsertConversationMeta,
} from "./chat-history-scaffold";
import { buildSmartChatTitleFromText } from "./chat-title";
import { ChatInputBar } from "./ChatInputBar";
import { MessageFeed } from "./MessageFeed";
import { PremiumUpgradePromo } from "./PremiumUpgradePromo";

type PublicConfig = {
  databaseConfigured: boolean;
};

type ConversationPayload = {
  id: string;
  title?: string;
  messages?: UIMessage[];
};

const dispatchActiveConversation = (id: string) => {
  window.dispatchEvent(
    new CustomEvent("caulfield:active-conversation", { detail: { id } }),
  );
};

const ChatLoadingSkeleton = () => (
  <div className="flex min-h-0 flex-1 flex-col bg-background px-3 py-6 md:px-4">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
      <div className="h-[4.5rem] w-[72%] self-end animate-pulse rounded-2xl bg-muted/80" />
      <div className="h-28 w-full animate-pulse rounded-2xl bg-muted/70" />
      <div className="h-20 w-[85%] self-end animate-pulse rounded-2xl bg-muted/80" />
    </div>
  </div>
);

export const ChatShell = () => {
  const { user, status } = useSession();
  const { syncNotesFromAgent } = useNotes();
  const { replaceAll: syncMemoryFromAgent } = useMemory();
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRetryNonce, setHistoryRetryNonce] = useState(0);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/config", { credentials: "include" });
        if (!r.ok) return;
        const c = (await r.json()) as PublicConfig;
        if (!cancelled) setCfg(c);
      } catch {
        if (!cancelled) setCfg({ databaseConfigured: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadServerConversation = useCallback(
    async (id: string) => {
      if (!cfg?.databaseConfigured || !user?.id) return;
      setHistoryReady(false);
      setHistoryError(null);
      try {
        const dataRes = await fetch(`/api/conversations/${id}`, {
          credentials: "include",
        });
        if (!dataRes.ok) {
          setHistoryError("Could not open that conversation. Try again.");
          setHistoryReady(true);
          return;
        }
        const data = (await dataRes.json()) as ConversationPayload;
        writeLastServerConversationId(id);
        setConvId(id);
        setInitialMessages(data.messages ?? []);
        setHistoryReady(true);
      } catch {
        setHistoryError("Could not open that conversation. Try again.");
        setHistoryReady(true);
      }
    },
    [cfg?.databaseConfigured, user?.id],
  );

  const handleNewChat = useCallback(async () => {
    setNewChatError(null);
    if (cfg?.databaseConfigured && user?.id) {
      setIsCreatingChat(true);
      try {
        const postRes = await fetch("/api/conversations", {
          method: "POST",
          credentials: "include",
        });
        if (!postRes.ok) {
          setNewChatError("Could not start a new chat. Try again.");
          return;
        }
        const created = (await postRes.json()) as { id?: string };
        if (!created.id) {
          setNewChatError("Could not start a new chat. Try again.");
          return;
        }
        writeLastServerConversationId(created.id);
        setConvId(created.id);
        setInitialMessages([]);
        window.dispatchEvent(new CustomEvent("caulfield:conversations-changed"));
      } finally {
        setIsCreatingChat(false);
      }
      return;
    }
    if (cfg && !cfg.databaseConfigured) {
      const next = crypto.randomUUID();
      setLocalActiveConversationId(next);
      upsertConversationMeta({
        id: next,
        title: "New chat",
        updatedAt: Date.now(),
      });
      setConvId(next);
      setInitialMessages([]);
    }
  }, [cfg, user?.id]);

  const handleNewChatRef = useRef(handleNewChat);
  handleNewChatRef.current = handleNewChat;
  const loadServerConversationRef = useRef(loadServerConversation);
  loadServerConversationRef.current = loadServerConversation;

  useEffect(() => {
    const onNewChatEvent = () => {
      void handleNewChatRef.current();
    };
    const onLoadChatEvent = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (typeof id !== "string" || !id.trim()) return;
      void loadServerConversationRef.current(id);
    };
    window.addEventListener("caulfield:new-chat", onNewChatEvent);
    window.addEventListener("caulfield:load-chat", onLoadChatEvent);
    return () => {
      window.removeEventListener("caulfield:new-chat", onNewChatEvent);
      window.removeEventListener("caulfield:load-chat", onLoadChatEvent);
    };
  }, []);

  useEffect(() => {
    if (cfg === null) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (!cfg.databaseConfigured) {
        if (!cancelled) {
          const id = getOrCreateLocalConversationId();
          const loaded = loadConversationMessages(id) ?? [];
          setConvId(id);
          setInitialMessages(loaded);
          setHistoryError(null);
          setHistoryReady(true);
        }
        return;
      }

      if (status === "loading") {
        return;
      }

      if (!user?.id) {
        if (!cancelled) {
          setConvId(null);
          setInitialMessages([]);
          setHistoryError(null);
          setHistoryReady(true);
        }
        return;
      }

      if (!cancelled) {
        setHistoryReady(false);
        setHistoryError(null);
      }

      try {
        const preferred = readLastServerConversationId();

        if (preferred) {
          const preferredRes = await fetch(`/api/conversations/${preferred}`, {
            credentials: "include",
          });
          if (preferredRes.ok) {
            const preferredConversation =
              (await preferredRes.json()) as ConversationPayload;
            if (!cancelled) {
              writeLastServerConversationId(preferredConversation.id);
              setConvId(preferredConversation.id);
              setInitialMessages(preferredConversation.messages ?? []);
              setHistoryError(null);
              setHistoryReady(true);
            }
            return;
          }
        }

        const listRes = await fetch("/api/conversations", {
          credentials: "include",
        });
        if (!listRes.ok) {
          throw new Error(`List failed (${listRes.status})`);
        }
        const list = (await listRes.json()) as { id: string }[];
        if (cancelled) return;

        let id = list[0]?.id;
        if (!id) {
          const postRes = await fetch("/api/conversations", {
            method: "POST",
            credentials: "include",
          });
          if (!postRes.ok) {
            throw new Error(`Create conversation failed (${postRes.status})`);
          }
          const created = (await postRes.json()) as { id?: string };
          const newId = created.id;
          if (!newId) {
            throw new Error("Create conversation returned no id");
          }
          id = newId;
        }
        if (cancelled) return;

        const dataRes = await fetch(`/api/conversations/${id}`, {
          credentials: "include",
        });
        if (!dataRes.ok) {
          throw new Error(`Load conversation failed (${dataRes.status})`);
        }
        const data = (await dataRes.json()) as ConversationPayload;
        if (cancelled) return;

        writeLastServerConversationId(id);
        setConvId(id);
        setInitialMessages(data.messages ?? []);
        setHistoryError(null);
        setHistoryReady(true);
      } catch (e) {
        if (cancelled) return;
        console.error("[ChatShell] Conversation bootstrap failed", e);
        setHistoryError(
          "Could not load your chat history. Check your connection and try again.",
        );
        setConvId(null);
        setInitialMessages([]);
        setHistoryReady(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [cfg, status, user?.id, historyRetryNonce]);

  useEffect(() => {
    if (!historyReady || !convId) return;
    dispatchActiveConversation(convId);
  }, [historyReady, convId]);

  const persistServer =
    Boolean(cfg?.databaseConfigured && user?.id && convId) && historyReady;
  const persistLocal =
    Boolean(cfg && !cfg.databaseConfigured && convId) && historyReady;

  const handleHistoryRetry = useCallback(() => {
    setHistoryError(null);
    setHistoryRetryNonce((n) => n + 1);
  }, []);

  if (!historyReady) {
    return <ChatLoadingSkeleton />;
  }

  if (historyError) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center"
        role="alert"
      >
        <p className="text-sm text-muted-foreground">{historyError}</p>
        <Button type="button" onClick={handleHistoryRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const showNewChat = persistServer || persistLocal;

  return (
    <ChatShellInner
      key={convId ?? "local"}
      convId={convId}
      persistServerHistory={persistServer}
      persistLocalHistory={persistLocal}
      initialMessages={initialMessages}
      onNewChat={showNewChat ? handleNewChat : undefined}
      isCreatingChat={isCreatingChat}
      newChatError={newChatError}
      syncNotesFromAgent={syncNotesFromAgent}
      syncMemoryFromAgent={syncMemoryFromAgent}
    />
  );
};

type InnerProps = {
  readonly convId: string | null;
  readonly persistServerHistory: boolean;
  readonly persistLocalHistory: boolean;
  readonly initialMessages: UIMessage[];
  readonly onNewChat?: () => void | Promise<void>;
  readonly isCreatingChat: boolean;
  readonly newChatError: string | null;
  readonly syncNotesFromAgent: (notes: Note[]) => void;
  readonly syncMemoryFromAgent: (m: MemoryEntry[]) => void;
};

const ChatShellInner = ({
  convId,
  persistServerHistory,
  persistLocalHistory,
  initialMessages,
  onNewChat,
  isCreatingChat,
  newChatError,
  syncNotesFromAgent,
  syncMemoryFromAgent,
}: InnerProps) => {
  const { messages, sendMessage, status, stop, setMessages, error, clearError } =
    useChatWithOpenRouter({
      onNotesSyncedFromAgent: syncNotesFromAgent,
      onMemorySyncedFromAgent: syncMemoryFromAgent,
      serverConversationId: persistServerHistory ? convId : null,
      persistServerHistory,
      localConversationId: persistLocalHistory ? convId : null,
      persistLocalHistory,
      initialMessages,
      chatInstanceId: convId ?? "default-local-chat",
      onServerTitleResolved: (title) => {
        if (!convId) {
          return;
        }
        window.dispatchEvent(
          new CustomEvent("caulfield:conversations-changed", {
            detail: { id: convId, title },
          }),
        );
      },
    });

  const handleSend = async (text: string) => {
    clearError();
    if (persistServerHistory && convId && messages.length === 0) {
      const nextTitle = buildSmartChatTitleFromText(text);
      window.dispatchEvent(
        new CustomEvent("caulfield:conversations-changed", {
          detail: { id: convId, title: nextTitle },
        }),
      );
    }
    await sendMessage({ text });
  };

  const handleClear = () => {
    clearError();
    setMessages([]);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-background">
      {onNewChat ? (
        <div className="flex shrink-0 flex-col gap-1 border-b border-border px-3 py-2">
          {newChatError ? (
            <p
              className="text-center text-xs text-destructive"
              role="alert"
            >
              {newChatError}
            </p>
          ) : null}
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              disabled={isCreatingChat}
              onClick={() => void onNewChat()}
            >
              {isCreatingChat ? (
                <Loader2
                  className="size-3.5 shrink-0 animate-spin"
                  aria-hidden
                />
              ) : null}
              New chat
            </Button>
          </div>
        </div>
      ) : null}
      <MessageFeed messages={messages} status={status} error={error} />
      <PremiumUpgradePromo />
      <ChatInputBar
        status={status}
        onSend={handleSend}
        onStop={stop}
        onClear={handleClear}
        disableClear={messages.length === 0}
      />
    </div>
  );
};
