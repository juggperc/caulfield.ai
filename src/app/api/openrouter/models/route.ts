import { buildModelsPayload } from "@/lib/openrouter/fetch-models";
import type { OpenRouterModelKind } from "@/lib/openrouter/model-types";
import { NextResponse } from "next/server";

export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const kindParam = searchParams.get("kind")?.toLowerCase();
  const kind: OpenRouterModelKind =
    kindParam === "embedding" ? "embedding" : "chat";

  try {
    const payload = await buildModelsPayload(kind);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load models";
    console.error("[openrouter/models]", message);
    return NextResponse.json(
      { error: message, kind, models: [], popular: [], rest: [] },
      { status: 502 },
    );
  }
};
