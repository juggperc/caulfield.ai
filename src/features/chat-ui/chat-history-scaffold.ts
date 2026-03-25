import { getAccountStorageScope } from "@/features/auth/storage-scope";
import type { UIMessage } from "ai";

type ChatConversationMeta = {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
  readonly accountScope: string;
};

const CONVERSATIONS_INDEX_KEY = "caulfield.chat.conversations.v1";

const LOCAL_ACTIVE_CONV_KEY = "caulfield.chat.localActiveConversationId.v1";

const CACHE_TTL_MS = 60_000;

type CachedMessages = {
  messages: UIMessage[];
  timestamp: number;
};

const messageCache = new Map<string, CachedMessages>();

const localActiveConversationStorageKey = (): string =>
  `${LOCAL_ACTIVE_CONV_KEY}:${getAccountStorageScope()}`;

const getChatHistoryIndexKey = (): string =>
  `${CONVERSATIONS_INDEX_KEY}:${getAccountStorageScope()}`;

const getCachedMessages = (conversationId: string): UIMessage[] | null => {
  const cached = messageCache.get(conversationId);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    messageCache.delete(conversationId);
    return null;
  }
  return cached.messages;
};

const setCachedMessages = (
  conversationId: string,
  messages: UIMessage[],
): void => {
  messageCache.set(conversationId, { messages, timestamp: Date.now() });
};

const invalidateCachedMessages = (conversationId: string): void => {
  messageCache.delete(conversationId);
};

export const getOrCreateLocalConversationId = (): string => {
  if (typeof window === "undefined") return "";
  try {
    const k = localActiveConversationStorageKey();
    const existing = sessionStorage.getItem(k)?.trim();
    if (existing && existing.length > 0) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(k, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

export const setLocalActiveConversationId = (id: string): void => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(localActiveConversationStorageKey(), id);
  } catch {
    /* private mode */
  }
};

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

export const upsertConversationMeta = (
  meta: Omit<ChatConversationMeta, "accountScope">,
): void => {
  if (typeof window === "undefined") return;
  const scope = getAccountStorageScope();
  const full: ChatConversationMeta = {
    ...meta,
    accountScope: scope,
  };
  try {
    const prev = listConversationMetas();
    const rest = prev.filter((m) => m.id !== full.id);
    const next = [full, ...rest];
    localStorage.setItem(getChatHistoryIndexKey(), JSON.stringify(next));
  } catch {
    /* quota */
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
    setCachedMessages(conversationId, messages);
  } catch {
    /* quota */
  }
};

export const loadConversationMessages = (
  conversationId: string,
): UIMessage[] | null => {
  if (typeof window === "undefined") return null;
  const cached = getCachedMessages(conversationId);
  if (cached) return cached;
  const scope = getAccountStorageScope();
  const key = `caulfield.chat.messages.v1:${scope}:${conversationId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    setCachedMessages(conversationId, parsed as UIMessage[]);
    return parsed as UIMessage[];
  } catch {
    return null;
  }
};

export const clearConversationCache = (conversationId?: string): void => {
  if (conversationId) {
    invalidateCachedMessages(conversationId);
  } else {
    messageCache.clear();
  }
};

export type { ChatConversationMeta };
