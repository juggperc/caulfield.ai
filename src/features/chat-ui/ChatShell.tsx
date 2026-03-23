"use client";

import { useChatWithOpenRouter } from "@/features/ai-agent/useChatWithOpenRouter";
import { useMemory } from "@/features/memory/memory-provider";
import { useNotes } from "@/features/notes/notes-context";
import { ChatInputBar } from "./ChatInputBar";
import { MessageFeed } from "./MessageFeed";

export const ChatShell = () => {
  const { syncNotesFromAgent } = useNotes();
  const { replaceAll: syncMemoryFromAgent } = useMemory();
  const { messages, sendMessage, status, stop, setMessages, error, clearError } =
    useChatWithOpenRouter({
      onNotesSyncedFromAgent: syncNotesFromAgent,
      onMemorySyncedFromAgent: syncMemoryFromAgent,
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
