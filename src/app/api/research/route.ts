import { auth } from "@/auth";
import { checkChatQuota, consumeChatQuery } from "@/lib/billing/quota";
import { isDbConfigured } from "@/lib/db";
import { getServerOpenRouterKey } from "@/lib/openrouter/server-models";
import { runDeepResearchAgent } from "@/features/research/run-deep-research-agent";
import { z } from "zod";

export const maxDuration = 120;

const BodySchema = z.object({
  topic: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return Response.json(
      {
        error: "Sign in to run research.",
        code: "UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  const apiKey = getServerOpenRouterKey();
  if (!apiKey) {
    return Response.json(
      {
        error:
          "AI is not configured on this server. Set OPENROUTER_API_KEY on the host.",
        code: "OPENROUTER_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const hosted = true;

  const quotaEnforced = hosted && isDbConfigured();
  if (quotaEnforced) {
    const qc = await checkChatQuota(userId, { billable: true });
    if (!qc.ok) {
      return Response.json(
        { error: qc.message, code: "QUOTA_EXCEEDED" },
        { status: 402 },
      );
    }
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const topic = parsed.data.topic.trim();

  try {
    const { summary, snippets } = await runDeepResearchAgent({ apiKey, topic });

    if (quotaEnforced) {
      try {
        await consumeChatQuery(userId, { billable: true });
      } catch (e) {
        console.error("[research] Failed to consume quota after generateText", e);
      }
    }

    return Response.json({
      ok: true as const,
      topic,
      summary,
      snippets,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
