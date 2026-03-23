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

/** Active thread when Postgres is not configured; survives refresh. */
const LOCAL_ACTIVE_CONV_KEY = "caulfield.chat.localActiveConversationId.v1";

const localActiveConversationStorageKey = (): string =>
  `${LOCAL_ACTIVE_CONV_KEY}:${getAccountStorageScope()}`;

export const getChatHistoryIndexKey = (): string =>
  `${CONVERSATIONS_INDEX_KEY}:${getAccountStorageScope()}`;

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

/** Merges into the scoped index; `anon` vs user scope are separate (no auto-migration). */
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
