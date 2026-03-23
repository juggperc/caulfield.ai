import { isDatabaseUrlConfigured } from "@/lib/db/database-url";
import { getEmbeddingModelId, getThinkingModelId } from "@/lib/openrouter/server-models";
import { NextResponse } from "next/server";

/** Safe, non-secret flags for the client. */
export const GET = () => {
  const openRouterConfigured = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  return NextResponse.json({
    openRouterConfigured,
    /** @deprecated Use openRouterConfigured */
    hostedOpenRouter: openRouterConfigured,
    chatModes: ["thinking", "free"] as const,
    /** Display hints only; real routing is server env. */
    labels: {
      thinking: "Grok 4.1 Fast",
      free: "Nemotron Free",
    },
    embeddingModelConfigured: Boolean(getEmbeddingModelId()),
    defaultModel: getThinkingModelId(),
    defaultEmbeddingModel: getEmbeddingModelId(),
    authProvidersConfigured: Boolean(
      (process.env.GITHUB_ID && process.env.GITHUB_SECRET) ||
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    ),
    databaseConfigured: isDatabaseUrlConfigured(),
  });
};
