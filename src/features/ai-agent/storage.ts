import { DEFAULT_EMBEDDING_MODEL } from "@/features/notes/constants";

export const STORAGE_KEYS = {
  openRouterKey: "caulfield.openrouter.apiKey",
  openRouterModel: "caulfield.openrouter.modelId",
  openRouterEmbeddingModel: "caulfield.openrouter.embeddingModel",
  context7ApiKey: "caulfield.connector.context7.apiKey",
  context7Enabled: "caulfield.connector.context7.enabled",
  exaApiKey: "caulfield.connector.exa.apiKey",
  exaEnabled: "caulfield.connector.exa.enabled",
  nativeSearchEnabled: "caulfield.connector.nativeSearch.enabled",
  githubEnabled: "caulfield.connector.github.enabled",
  githubToken: "caulfield.connector.github.token",
} as const;

export type IntegrationKeysBody = {
  context7ApiKey?: string;
  exaApiKey?: string;
  nativeSearchEnabled?: boolean;
  githubEnabled?: boolean;
  githubToken?: string;
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
  if (localStorage.getItem(STORAGE_KEYS.nativeSearchEnabled) === "1") {
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

export const readOpenRouterModel = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.openRouterModel) ?? "";
};

export const readOpenRouterEmbeddingModel = (): string => {
  if (typeof window === "undefined") return DEFAULT_EMBEDDING_MODEL;
  return (
    localStorage.getItem(STORAGE_KEYS.openRouterEmbeddingModel) ??
    DEFAULT_EMBEDDING_MODEL
  );
};
