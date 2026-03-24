import { checkChatQuota, consumeChatQuery } from "@/lib/billing/quota";
import { tool } from "ai";
import { z } from "zod";
import { runDeepResearchAgent } from "./run-deep-research-agent";
import type { ResearchSnippet } from "./research-types";

export type DeepResearchToolOutput = {
  readonly ok: boolean;
  readonly topic?: string;
  readonly summary?: string;
  readonly snippets?: ResearchSnippet[];
  readonly snippetCount?: number;
  readonly error?: string;
};

export const createDeepResearchChatTool = (opts: {
  readonly apiKey: string;
  readonly userId: string;
  readonly quotaEnforced: boolean;
}) => ({
  deep_research: tool({
    description:
      "Run **multi-step deep research** (Wikipedia, arXiv, public web) and save **cited snippets** for this workspace. Use when the user needs a thorough, sourced overview or comparison—not for quick one-line facts (use web lookup tools for those). Returns a short synthesis plus snippets; the UI merges snippets into research context.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("Topic or question to research in depth (clear and specific)"),
    }),
    execute: async ({ topic }): Promise<DeepResearchToolOutput> => {
      const t = topic.trim();
      if (!t) {
        return { ok: false, error: "Empty topic" };
      }
      if (opts.quotaEnforced) {
        const qc = await checkChatQuota(opts.userId, { billable: true });
        if (!qc.ok) {
          return { ok: false, error: qc.message };
        }
      }
      try {
        const { summary, snippets } = await runDeepResearchAgent({
          apiKey: opts.apiKey,
          topic: t,
        });
        if (opts.quotaEnforced) {
          try {
            await consumeChatQuery(opts.userId, { billable: true });
          } catch (e) {
            console.error("[deep_research] Failed to consume quota", e);
          }
        }
        return {
          ok: true,
          topic: t,
          summary,
          snippets,
          snippetCount: snippets.length,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Research failed";
        return { ok: false, error: message };
      }
    },
  }),
});
