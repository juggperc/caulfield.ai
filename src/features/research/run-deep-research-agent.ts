import { getResearchModelId } from "@/lib/openrouter/server-models";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, stepCountIs } from "ai";
import { createResearchAgentTools } from "./research-agent-tools";
import type { ResearchSnippet } from "./research-types";

const RESEARCH_SYSTEM = `You are a **Deep Research** agent running in a multi-step tool loop (ralph-style).

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

export const runDeepResearchAgent = async (params: {
  readonly apiKey: string;
  readonly topic: string;
}): Promise<{ readonly summary: string; readonly snippets: ResearchSnippet[] }> => {
  const topic = params.topic.trim();
  const snippets: ResearchSnippet[] = [];
  const collector = { topic, snippets };
  const { tools } = createResearchAgentTools(collector);
  const modelId = getResearchModelId();
  const openrouter = createOpenRouter({ apiKey: params.apiKey });
  const prompt = `Research topic:\n"""${topic}"""\n\nGather sources, save snippets with research_save_snippet, then summarize key takeaways for the user.`;

  const { text } = await generateText({
    model: openrouter(modelId),
    system: RESEARCH_SYSTEM,
    prompt,
    tools,
    stopWhen: stepCountIs(16),
  });

  return { summary: text ?? "", snippets };
};
