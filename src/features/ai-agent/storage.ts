import { DEFAULT_EMBEDDING_MODEL } from "@/features/notes/constants";

export type StoredChatMode = "thinking" | "free";

const CHAT_MODE_KEY = "caulfield.chat.mode";

export const STORAGE_KEYS = {
  openRouterKey: "caulfield.openrouter.apiKey",
  openRouterModel: "caulfield.openrouter.modelId",
  openRouterEmbeddingModel: "caulfield.openrouter.embeddingModel",
  context7ApiKey: "caulfield.connector.context7.apiKey",
  context7Enabled: "caulfield.connector.context7.enabled",
  exaApiKey: "caulfield.connector.exa.apiKey",
  exaEnabled: "caulfield.connector.exa.enabled",
  nativeSearchEnabled: "caulfield.connector.nativeSearch.enabled",
  chatRagMemoryEnabled: "caulfield.chat.rag.memory.enabled",
  chatRagResearchEnabled: "caulfield.chat.rag.research.enabled",
  githubEnabled: "caulfield.connector.github.enabled",
  githubToken: "caulfield.connector.github.token",
} as const;

/** Chat tier for hosted-only routing (`x-chat-mode`). Migrates legacy `openRouterModel` once. */
export const readChatMode = (): StoredChatMode => {
  if (typeof window === "undefined") return "thinking";
  try {
    const v = localStorage.getItem(CHAT_MODE_KEY)?.trim().toLowerCase();
    if (v === "free" || v === "thinking") return v;
    const legacy =
      localStorage.getItem(STORAGE_KEYS.openRouterModel)?.trim() ?? "";
    const lower = legacy.toLowerCase();
    if (lower.includes(":free")) {
      writeChatMode("free");
      return "free";
    }
    if (legacy.length > 0) {
      writeChatMode("thinking");
      return "thinking";
    }
  } catch {
    /* private mode */
  }
  return "thinking";
};

export const writeChatMode = (mode: StoredChatMode): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_MODE_KEY, mode);
  } catch {
    /* quota */
  }
};

export type IntegrationKeysBody = {
  context7ApiKey?: string;
  exaApiKey?: string;
  nativeSearchEnabled?: boolean;
  githubEnabled?: boolean;
  githubToken?: string;
};

let _webSearchOverride: boolean | null = null;

export const setWebSearchOverride = (enabled: boolean): void => {
  _webSearchOverride = enabled;
};

export const readIntegrationKeysForChatBody = (): IntegrationKeysBody => {
  if (typeof window === "undefined") return {};
  const out: IntegrationKeysBody = {};
  const c7k = localStorage.getItem(STORAGE_KEYS.context7ApiKey)?.trim() ?? "";
  const c7e = localStorage.getItem(STORAGE_KEYS.context7Enabled) === "1";
  if (c7e && c7k) out.context7ApiKey = c7k;
  const exk = localStorage.getItem(STORAGE_KEYS.exaApiKey)?.trim() ?? "";
  const exe = localStorage.getItem(STORAGE_KEYS.exaEnabled) === "1";
  if (exe && exk) out.exaApiKey = exk;
  if (_webSearchOverride !== null) {
    out.nativeSearchEnabled = _webSearchOverride;
  } else if (localStorage.getItem(STORAGE_KEYS.nativeSearchEnabled) !== "0") {
    out.nativeSearchEnabled = true;
  }
  if (localStorage.getItem(STORAGE_KEYS.githubEnabled) === "1") {
    out.githubEnabled = true;
    const gh = localStorage.getItem(STORAGE_KEYS.githubToken)?.trim() ?? "";
    if (gh) out.githubToken = gh;
  }
  return out;
};

export const readOpenRouterKey = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.openRouterKey) ?? "";
};

export const writeOpenRouterKey = (value: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.openRouterKey, value);
};

export const readOpenRouterModel = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.openRouterModel) ?? "";
};

export const writeOpenRouterModel = (modelId: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.openRouterModel, modelId);
};

export const readOpenRouterEmbeddingModel = (): string => {
  if (typeof window === "undefined") return DEFAULT_EMBEDDING_MODEL;
  return (
    localStorage.getItem(STORAGE_KEYS.openRouterEmbeddingModel) ??
    DEFAULT_EMBEDDING_MODEL
  );
};

export const writeOpenRouterEmbeddingModel = (modelId: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.openRouterEmbeddingModel, modelId);
};

/** Default on when unset; only explicit `"0"` disables (same pattern as native search). */
export const readChatRagMemoryEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEYS.chatRagMemoryEnabled) !== "0";
};

export const writeChatRagMemoryEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.removeItem(STORAGE_KEYS.chatRagMemoryEnabled);
    } else {
      localStorage.setItem(STORAGE_KEYS.chatRagMemoryEnabled, "0");
    }
  } catch {
    /* quota */
  }
};

/** Default on when unset; only explicit `"0"` disables. */
export const readChatRagResearchEnabled = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEYS.chatRagResearchEnabled) !== "0";
};

export const writeChatRagResearchEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      localStorage.removeItem(STORAGE_KEYS.chatRagResearchEnabled);
    } else {
      localStorage.setItem(STORAGE_KEYS.chatRagResearchEnabled, "0");
    }
  } catch {
    /* quota */
  }
};
