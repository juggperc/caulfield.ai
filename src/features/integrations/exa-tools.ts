import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { tool } from "ai";
import { z } from "zod";

const EXA_SEARCH = "https://api.exa.ai/search";
const MAX_TOOL_JSON_CHARS = 12_000;

const truncateJson = (value: unknown): unknown => {
  const s = JSON.stringify(value);
  if (s.length <= MAX_TOOL_JSON_CHARS) return value;
  return {
    truncated: true,
    preview: s.slice(0, MAX_TOOL_JSON_CHARS),
    message: "Output truncated for context size",
  };
};

export const createExaSearchToolset = (apiKey: string) => {
  const tools = {
    exa_search: tool({
      description:
        "Search the web with Exa (neural/keyword). Use for fresh links, papers, news, and facts not in notes.",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        numResults: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Number of results (default 8)"),
        type: z
          .enum(["auto", "fast", "instant", "deep", "deep-reasoning"])
          .optional()
          .describe("Search mode; default auto"),
      }),
      execute: async ({ query, numResults = 8, type = "auto" }) => {
        const res = await fetchWithTimeout(EXA_SEARCH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
          },
          body: JSON.stringify({
            query,
            numResults,
            type,
            contents: { text: { maxCharacters: 1500 } },
          }),
        });
        const text = await res.text();
        if (!res.ok) {
          return { error: true, status: res.status, body: text.slice(0, 2000) };
        }
        try {
          const data = JSON.parse(text) as unknown;
          return truncateJson(data);
        } catch {
          return { raw: text.slice(0, MAX_TOOL_JSON_CHARS) };
        }
      },
    }),
  };

  return { tools };
};
