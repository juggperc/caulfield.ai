import { NextResponse } from "next/server";

/** Safe, non-secret flags for the client. */
export const GET = () => {
  return NextResponse.json({
    hostedOpenRouter: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    defaultModel:
      process.env.OPENROUTER_DEFAULT_MODEL?.trim() || "x-ai/grok-3-fast",
    defaultEmbeddingModel:
      process.env.OPENROUTER_DEFAULT_EMBEDDING_MODEL?.trim() ||
      "openai/text-embedding-3-small",
    authProvidersConfigured: Boolean(
      (process.env.GITHUB_ID && process.env.GITHUB_SECRET) ||
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    ),
    databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
  });
};
