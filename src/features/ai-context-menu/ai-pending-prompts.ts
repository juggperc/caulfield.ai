const CHAT_KEY = "caulfield.ai.pendingChat.v1";
const DOCS_KEY = "caulfield.ai.pendingDocsAssist.v1";

export type PendingChatPayload = {
  readonly text: string;
  readonly focus: boolean;
};

const parseChatPayload = (raw: string): PendingChatPayload | null => {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.text !== "string" || typeof o.focus !== "boolean") return null;
    return { text: o.text, focus: o.focus };
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
};

export const setPendingChatInput = (
  text: string,
  options?: { readonly focus?: boolean },
) => {
  const payload: PendingChatPayload = {
    text,
    focus: options?.focus !== false,
  };
  write(CHAT_KEY, JSON.stringify(payload));
};

/** Read without removing (safe for Strict Mode double render). */
export const peekPendingChatInput = (): PendingChatPayload | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHAT_KEY);
    if (raw == null) return null;
    return parseChatPayload(raw);
  } catch {
    return null;
  }
};

export const clearPendingChatInput = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHAT_KEY);
  } catch {
    /* ignore */
  }
};

export const setPendingDocsAssistantInput = (text: string) => {
  write(DOCS_KEY, JSON.stringify({ text }));
};

export const peekPendingDocsAssistantInput = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DOCS_KEY);
    if (raw == null) return null;
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    const t = (v as { text?: unknown }).text;
    return typeof t === "string" ? t : null;
  } catch {
    return null;
  }
};

export const clearPendingDocsAssistantInput = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DOCS_KEY);
  } catch {
    /* ignore */
  }
};

const wrapQuote = (selection: string) =>
  selection
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

export const buildQuotedChatMessage = (selection: string) =>
  `Use this as context:\n\n${wrapQuote(selection.trim())}`;
