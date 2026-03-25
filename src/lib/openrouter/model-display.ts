import {
  getThinkingModelId,
  resolveChatModelId,
  type ChatMode,
} from "@/lib/openrouter/server-models";

/** Human-readable fallback from OpenRouter-style id (last segment, trim :free). */
export const shortLabelFromModelId = (modelId: string): string => {
  const t = modelId.trim();
  if (!t) return "Model";
  const parts = t.split("/");
  const last = parts[parts.length - 1] ?? t;
  return last.replace(/:free$/i, "").replace(/-/g, " ") || "Model";
};

export const getChatModeModelIds = () => ({
  thinkingModelId: getThinkingModelId(),
  freeModelId: resolveChatModelId("free"),
  freeFastModelId: resolveChatModelId("freeFast"),
  maxModelId: resolveChatModelId("max"),
});

export const resolveChatModeLabels = (env: NodeJS.ProcessEnv): {
  thinkingModelId: string;
  freeModelId: string;
  freeFastModelId: string;
  maxModelId: string;
  thinkingLabel: string;
  freeLabel: string;
  freeFastLabel: string;
  maxLabel: string;
} => {
  const ids = getChatModeModelIds();
  return {
    ...ids,
    thinkingLabel:
      env.OPENROUTER_LABEL_THINKING?.trim() ||
      shortLabelFromModelId(ids.thinkingModelId),
    freeLabel:
      env.OPENROUTER_LABEL_FREE?.trim() ||
      shortLabelFromModelId(ids.freeModelId),
    freeFastLabel:
      env.OPENROUTER_LABEL_FREEFAST?.trim() || "Free (Fast)",
    maxLabel:
      env.OPENROUTER_LABEL_MAX?.trim() || "Max",
  };
};

export const labelForChatMode = (
  mode: ChatMode,
  labels: { thinkingLabel: string; freeLabel: string; freeFastLabel: string; maxLabel: string },
): string => {
  switch (mode) {
    case "free":
      return labels.freeLabel;
    case "freeFast":
      return labels.freeFastLabel;
    case "max":
      return labels.maxLabel;
    default:
      return labels.thinkingLabel;
  }
};
