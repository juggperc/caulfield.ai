"use client";

import { useSession } from "@/features/auth/session-context";
import { useChatWithOpenRouter } from "@/features/ai-agent/useChatWithOpenRouter";
import type { MemoryEntry } from "@/features/memory/memory-types";
import { useMemory } from "@/features/memory/memory-provider";
import { useNotes } from "@/features/notes/notes-context";
import type { Note } from "@/features/notes/types";
import type { UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const c = await fetch("/api/config", { credentials: "include" }).then(
        (r) => r.json() as Promise<PublicConfig>,
      );
      if (cancelled) return;
      setCfg(c);
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
          setConvId(null);
          setInitialMessages([]);
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
          setHistoryReady(true);
        }
        return;
      }

      if (!cancelled) {
        setHistoryReady(false);
      }

      const list = await fetch("/api/conversations", {
        credentials: "include",
      }).then((r) => r.json() as Promise<{ id: string }[]>);
      if (cancelled) return;

      let id = list[0]?.id;
      if (!id) {
        const created = await fetch("/api/conversations", {
          method: "POST",
          credentials: "include",
        }).then((r) => r.json() as Promise<{ id: string }>);
        id = created.id;
      }
      if (cancelled) return;

      const data = await fetch(`/api/conversations/${id}`, {
        credentials: "include",
      }).then((r) => r.json() as Promise<{ messages: UIMessage[] }>);
      if (cancelled) return;

      if (!cancelled) {
        setConvId(id);
        setInitialMessages(data.messages ?? []);
        setHistoryReady(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [cfg, status, user?.id]);

  const persist =
    Boolean(cfg?.databaseConfigured && user?.id && convId) && historyReady;

  const handleNewChat = useCallback(async () => {
    if (!persist) return;
    const created = await fetch("/api/conversations", {
      method: "POST",
      credentials: "include",
    }).then((r) => r.json() as Promise<{ id: string }>);
    setConvId(created.id);
    setInitialMessages([]);
  }, [persist]);

  if (!historyReady) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background text-sm text-muted-foreground">
        Loading chat…
      </div>
    );
  }

  return (
    <ChatShellInner
      key={convId ?? "local"}
      convId={convId}
      persist={persist}
      initialMessages={initialMessages}
      onNewChat={persist ? handleNewChat : undefined}
      syncNotesFromAgent={syncNotesFromAgent}
      syncMemoryFromAgent={syncMemoryFromAgent}
    />
  );
};

type InnerProps = {
  readonly convId: string | null;
  readonly persist: boolean;
  readonly initialMessages: UIMessage[];
  readonly onNewChat?: () => void;
  readonly syncNotesFromAgent: (notes: Note[]) => void;
  readonly syncMemoryFromAgent: (m: MemoryEntry[]) => void;
};

const ChatShellInner = ({
  convId,
  persist,
  initialMessages,
  onNewChat,
  syncNotesFromAgent,
  syncMemoryFromAgent,
}: InnerProps) => {
  const { messages, sendMessage, status, stop, setMessages, error, clearError } =
    useChatWithOpenRouter({
      onNotesSyncedFromAgent: syncNotesFromAgent,
      onMemorySyncedFromAgent: syncMemoryFromAgent,
      serverConversationId: convId,
      persistServerHistory: persist,
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
