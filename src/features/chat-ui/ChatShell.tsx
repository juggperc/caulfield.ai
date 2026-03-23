"use client";

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
  const { syncNotesFromAgent } = useNotes();
  const { replaceAll: syncMemoryFromAgent } = useMemory();
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  const [sessionUser, setSessionUser] = useState<{ id: string } | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const c = await fetch("/api/config").then((r) => r.json() as Promise<PublicConfig>);
      if (cancelled) return;
      setCfg(c);
      if (!c.databaseConfigured) {
        setHistoryReady(true);
        return;
      }
      const sess = await fetch("/api/auth/session").then(
        (r) => r.json() as Promise<{ user?: { id?: string } }>,
      );
      if (cancelled) return;
      if (!sess?.user?.id) {
        setHistoryReady(true);
        return;
      }
      setSessionUser({ id: sess.user.id });
      const list = await fetch("/api/conversations", { credentials: "include" }).then(
        (r) => r.json() as Promise<{ id: string }[]>,
      );
      if (cancelled) return;
      let id = list[0]?.id;
      if (!id) {
        const created = await fetch("/api/conversations", {
          method: "POST",
          credentials: "include",
        }).then((r) => r.json() as Promise<{ id: string }>);
        id = created.id;
      }
      const data = await fetch(`/api/conversations/${id}`, {
        credentials: "include",
      }).then(
        (r) => r.json() as Promise<{ messages: UIMessage[] }>,
      );
      if (cancelled) return;
      setConvId(id);
      setInitialMessages(data.messages ?? []);
      setHistoryReady(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist =
    Boolean(cfg?.databaseConfigured && sessionUser?.id && convId) &&
    historyReady;

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
