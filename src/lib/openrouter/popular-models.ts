/**
 * Boost these into the "Popular" group when present in the OpenRouter response.
 * IDs are exact slugs from the upstream API — update occasionally as providers rename.
 */
export const POPULAR_CHAT_MODEL_IDS: readonly string[] = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.7-sonnet",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "x-ai/grok-3",
  "deepseek/deepseek-chat",
  "mistralai/mistral-large",
] as const;

export const POPULAR_EMBEDDING_MODEL_IDS: readonly string[] = [
  "openai/text-embedding-3-small",
  "openai/text-embedding-3-large",
  "openai/text-embedding-ada-002",
  "google/gemini-embedding-001",
  "qwen/qwen3-embedding-4b",
  "qwen/qwen3-embedding-8b",
] as const;
