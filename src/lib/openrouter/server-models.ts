import { DEFAULT_EMBEDDING_MODEL } from "@/features/notes/constants";

export type ChatMode = "thinking" | "free" | "freeFast" | "max";

const DEFAULT_THINKING =
  process.env.OPENROUTER_MODEL_THINKING?.trim() ||
  process.env.OPENROUTER_DEFAULT_MODEL?.trim() ||
  "x-ai/grok-4.1-fast";

const DEFAULT_FREE =
  process.env.OPENROUTER_MODEL_FREE?.trim() ||
  "nvidia/nemotron-3-super-120b-a12b:free";

const DEFAULT_FREE_FAST =
  process.env.OPENROUTER_MODEL_FREEFAST?.trim() ||
  "stepfun/step-3.5-flash:free";

const DEFAULT_MAX =
  process.env.OPENROUTER_MODEL_MAX?.trim() ||
  "deepseek/deepseek-v3.2";

export const parseChatModeHeader = (raw: string | null): ChatMode => {
  const v = raw?.trim().toLowerCase();
  if (v === "free") return "free";
  if (v === "freefast" || v === "free-fast") return "freeFast";
  if (v === "max") return "max";
  return "thinking";
};

export const getServerOpenRouterKey = (): string | undefined =>
  process.env.OPENROUTER_API_KEY?.trim() || undefined;

export const getThinkingModelId = (): string => DEFAULT_THINKING;

export const resolveChatModelId = (mode: ChatMode): string => {
  switch (mode) {
    case "free":
      return DEFAULT_FREE;
    case "freeFast":
      return DEFAULT_FREE_FAST;
    case "max":
      return DEFAULT_MAX;
    default:
      return DEFAULT_THINKING;
  }
};

export const getResearchModelId = (): string =>
  process.env.OPENROUTER_RESEARCH_MODEL?.trim() || getThinkingModelId();

export const getEmbeddingModelId = (): string =>
  process.env.OPENROUTER_DEFAULT_EMBEDDING_MODEL?.trim() ||
  DEFAULT_EMBEDDING_MODEL;

export const isChatBillable = (mode: ChatMode): boolean =>
  mode !== "free" && mode !== "freeFast";
