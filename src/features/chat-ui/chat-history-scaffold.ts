import { getAccountStorageScope } from "@/features/auth/storage-scope";
import type { UIMessage } from "ai";

/**
 * Scaffold for per-account chat history (server sync with Vercel KV / Postgres later).
 * Local persistence is optional; wire `useChat` `initialMessages` + `onFinish` save here.
 */
export type ChatConversationMeta = {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly accountScope: string;
};

const CONVERSATIONS_INDEX_KEY = "caulfield.chat.conversations.v1";

export const getChatHistoryIndexKey = (): string =>
  `${CONVERSATIONS_INDEX_KEY}:${getAccountStorageScope()}`;

export const listConversationMetas = (): ChatConversationMeta[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getChatHistoryIndexKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ChatConversationMeta =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as ChatConversationMeta).id === "string",
    );
  } catch {
    return [];
  }
};

export const saveConversationMessages = (
  conversationId: string,
  messages: UIMessage[],
): void => {
  if (typeof window === "undefined") return;
  const scope = getAccountStorageScope();
  const key = `caulfield.chat.messages.v1:${scope}:${conversationId}`;
  try {
    localStorage.setItem(key, JSON.stringify(messages));
  } catch {
    /* quota */
  }
};

export const loadConversationMessages = (
  conversationId: string,
): UIMessage[] | null => {
  if (typeof window === "undefined") return null;
  const scope = getAccountStorageScope();
  const key = `caulfield.chat.messages.v1:${scope}:${conversationId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as UIMessage[]) : null;
  } catch {
    return null;
  }
};
