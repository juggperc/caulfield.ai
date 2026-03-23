"use client";

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
import { useCallback, useEffect, useState } from "react";
import {
  getOrCreateLocalConversationId,
  loadConversationMessages,
  setLocalActiveConversationId,
  upsertConversationMeta,
} from "./chat-history-scaffold";
import { ChatInputBar } from "./ChatInputBar";
import { MessageFeed } from "./MessageFeed";

type PublicConfig = {
  databaseConfigured: boolean;
};

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
        const listRes = await fetch("/api/conversations", {
          credentials: "include",
        });
        if (!listRes.ok) {
          throw new Error(`List failed (${listRes.status})`);
        }
        const list = (await listRes.json()) as { id: string }[];
        if (cancelled) return;

        const preferred = readLastServerConversationId();
        const preferredOk =
          preferred && list.some((row) => row.id === preferred)
            ? preferred
            : null;

        let id = preferredOk ?? list[0]?.id;
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
        const data = (await dataRes.json()) as { messages?: UIMessage[] };
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

  const persistServer =
    Boolean(cfg?.databaseConfigured && user?.id && convId) && historyReady;
  const persistLocal =
    Boolean(cfg && !cfg.databaseConfigured && convId) && historyReady;

  const handleNewChat = useCallback(async () => {
    if (cfg?.databaseConfigured && user?.id) {
      const postRes = await fetch("/api/conversations", {
        method: "POST",
        credentials: "include",
      });
      if (!postRes.ok) return;
      const created = (await postRes.json()) as { id?: string };
      if (!created.id) return;
      writeLastServerConversationId(created.id);
      setConvId(created.id);
      setInitialMessages([]);
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

  const handleHistoryRetry = useCallback(() => {
    setHistoryError(null);
    setHistoryRetryNonce((n) => n + 1);
  }, []);

  if (!historyReady) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background text-sm text-muted-foreground">
        Loading chat…
      </div>
    );
  }

  if (historyError) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center"
        role="alert"
      >
        <p className="text-sm text-muted-foreground">{historyError}</p>
        <button
          type="button"
          onClick={handleHistoryRetry}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
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
  readonly onNewChat?: () => void;
  readonly syncNotesFromAgent: (notes: Note[]) => void;
  readonly syncMemoryFromAgent: (m: MemoryEntry[]) => void;
};

const ChatShellInner = ({
  convId,
  persistServerHistory,
  persistLocalHistory,
  initialMessages,
  onNewChat,
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
    });

  const handleSend = async (text: string) => {
    clearError();
    await sendMessage({ text });
  };

  const handleClear = () => {
    clearError();
    setMessages([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {onNewChat ? (
        <div className="flex shrink-0 items-center justify-end border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => void onNewChat()}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            New chat
          </button>
        </div>
      ) : null}
      <MessageFeed messages={messages} status={status} error={error} />
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
