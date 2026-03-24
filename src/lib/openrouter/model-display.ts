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

export const getChatModeModelIds = (): {
  thinkingModelId: string;
  freeModelId: string;
} => ({
  thinkingModelId: getThinkingModelId(),
  freeModelId: resolveChatModelId("free"),
});

export const resolveChatModeLabels = (env: NodeJS.ProcessEnv): {
  thinkingModelId: string;
  freeModelId: string;
  thinkingLabel: string;
  freeLabel: string;
} => {
  const { thinkingModelId, freeModelId } = getChatModeModelIds();
  const thinkingLabel =
    env.OPENROUTER_LABEL_THINKING?.trim() ||
    shortLabelFromModelId(thinkingModelId);
  const freeLabel =
    env.OPENROUTER_LABEL_FREE?.trim() || shortLabelFromModelId(freeModelId);
  return {
    thinkingModelId,
    freeModelId,
    thinkingLabel,
    freeLabel,
  };
};

export const labelForChatMode = (
  mode: ChatMode,
  labels: { thinkingLabel: string; freeLabel: string },
): string => (mode === "free" ? labels.freeLabel : labels.thinkingLabel);
