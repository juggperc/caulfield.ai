import { createResearchAgentTools } from "@/features/research/research-agent-tools";
import type { ResearchSnippet } from "@/features/research/research-types";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";

export const maxDuration = 120;

const BodySchema = z.object({
  topic: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-openrouter-key")?.trim();
  const modelId = req.headers.get("x-openrouter-model")?.trim();

  if (!apiKey || !modelId) {
    return Response.json(
      {
        error:
          "Missing OpenRouter API key or model. Configure them in settings.",
      },
      { status: 400 },
    );
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
  const snippets: ResearchSnippet[] = [];
  const collector = { topic, snippets };
  const { tools } = createResearchAgentTools(collector);

  const system = `You are a **Deep Research** agent running in a multi-step tool loop (ralph-style).

Mission: produce **high-quality, citable snippets** about the user's topic using real sources.

Workflow:
1. Plan briefly (internally), then use **research_wikipedia** and **research_arxiv_search** / **research_arxiv_abstract** for authoritative grounding.
2. Use **research_fetch_url** only for specific public pages when needed (respect truncation; use startOffset to read more chunks).
3. After each substantive finding, call **research_save_snippet** with a clear title, the excerpt or synthesis, correct sourceType, and sourceUrl.
4. Aim for **at least 3 saved snippets** when the topic allows, covering different angles. Stop when coverage is solid or you hit diminishing returns (typically within the step budget).

Rules:
- Never invent URLs. Use tools to obtain text.
- Prefer Wikipedia and arXiv for factual/scientific claims; use the web fetch tool for documentation or articles.
- Keep snippet bodies focused (roughly one screen of text max each).
- Your final **text** reply should be a concise synthesis (bullet summary) for the user; snippets are stored separately via tools.`;

  const prompt = `Research topic:\n"""${topic}"""\n\nGather sources, save snippets with research_save_snippet, then summarize key takeaways for the user.`;

  try {
    const openrouter = createOpenRouter({ apiKey });
    const { text } = await generateText({
      model: openrouter(modelId),
      system,
      prompt,
      tools,
      stopWhen: stepCountIs(16),
    });

    return Response.json({
      ok: true as const,
      topic,
      summary: text ?? "",
      snippets,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
