import { isDatabaseUrlConfigured } from "@/lib/db/database-url";
import { resolveChatModeLabels } from "@/lib/openrouter/model-display";
import { getEmbeddingModelId, getThinkingModelId } from "@/lib/openrouter/server-models";
import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

const isCredentialAuthConfigured = (): boolean => {
  const hasSecret = Boolean(process.env.AUTH_SECRET?.trim());
  const dbOk = isDatabaseUrlConfigured();
  const hasAltchaKey = Boolean(process.env.ALTCHA_HMAC_KEY?.trim());
  const bypass = isDev && process.env.ALTCHA_DEV_BYPASS === "1";
  return Boolean(hasSecret && dbOk && (hasAltchaKey || bypass));
};

/** Safe, non-secret flags for the client. */
export const GET = () => {
  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const credentialAuthConfigured = isCredentialAuthConfigured();
  const databaseConfigured = isDatabaseUrlConfigured();
  const {
    thinkingModelId,
    freeModelId,
    freeFastModelId,
    maxModelId,
    thinkingLabel,
    freeLabel,
    freeFastLabel,
    maxLabel,
  } = resolveChatModeLabels(process.env);

  return NextResponse.json({
    openRouterConfigured,
    /** @deprecated Use openRouterConfigured */
    hostedOpenRouter: openRouterConfigured,
    chatModes: ["thinking", "free", "freeFast", "max"] as const,
    thinkingModelId,
    freeModelId,
    freeFastModelId,
    maxModelId,
    /** Display names aligned with server routing (`OPENROUTER_MODEL_*`, optional `OPENROUTER_LABEL_*`). */
    labels: {
      thinking: thinkingLabel,
      free: freeLabel,
      freeFast: freeFastLabel,
      max: maxLabel,
    },
    embeddingModelConfigured: Boolean(getEmbeddingModelId()),
    defaultModel: getThinkingModelId(),
    defaultEmbeddingModel: getEmbeddingModelId(),
    credentialAuthConfigured,
    /** @deprecated Use credentialAuthConfigured */
    authProvidersConfigured: credentialAuthConfigured,
    altchaDevBypass: isDev && process.env.ALTCHA_DEV_BYPASS === "1",
    databaseConfigured,
    billingCheckoutConfigured: Boolean(process.env.POLAR_CHECKOUT_URL?.trim()),
  });
};
