import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { tool } from "ai";
import { z } from "zod";

const MAX_TOOL_JSON_CHARS = 10_000;

const truncate = (s: string, max: number) =>
  s.length <= max ? s : `${s.slice(0, max)}…`;

const truncatePayload = (value: unknown): unknown => {
  const s = JSON.stringify(value);
  if (s.length <= MAX_TOOL_JSON_CHARS) return value;
  return {
    truncated: true,
    preview: s.slice(0, MAX_TOOL_JSON_CHARS),
    message: "Output truncated for context size",
  };
};

type DdgTopic = { Text?: string; FirstURL?: string };

export const createNativeSearchToolset = () => {
  const tools = {
    native_web_lookup: tool({
      description:
        "Look up public facts using DuckDuckGo instant data and English Wikipedia search (no third-party API key). Use for definitions, summaries, and article titles; prefer notes/tools for private data.",
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .max(500)
          .describe("Topic or question to look up"),
      }),
      execute: async ({ query }) => {
        const ddgUrl = new URL("https://api.duckduckgo.com/");
        ddgUrl.searchParams.set("q", query);
        ddgUrl.searchParams.set("format", "json");
        ddgUrl.searchParams.set("no_html", "1");
        ddgUrl.searchParams.set("skip_disambig", "1");

        const wikiUrl = new URL("https://en.wikipedia.org/w/api.php");
        wikiUrl.searchParams.set("action", "query");
        wikiUrl.searchParams.set("list", "search");
        wikiUrl.searchParams.set("srsearch", query);
        wikiUrl.searchParams.set("format", "json");
        wikiUrl.searchParams.set("srlimit", "5");
        wikiUrl.searchParams.set("origin", "*");

        let duckduckgo: unknown = { error: "unavailable" };
        let wikipedia: unknown = { error: "unavailable" };

        try {
          const res = await fetchWithTimeout(ddgUrl.toString(), {
            headers: { Accept: "application/json" },
          });
          const text = await res.text();
          if (res.ok) {
            const j = JSON.parse(text) as Record<string, unknown>;
            const rawTopics = j.RelatedTopics;
            const related =
              Array.isArray(rawTopics) && rawTopics.length > 0
                ? rawTopics.slice(0, 8).flatMap((x) => {
                    if (typeof x === "object" && x !== null && "Text" in x) {
                      const t = x as DdgTopic;
                      return [
                        {
                          text: t.Text,
                          url: t.FirstURL,
                        },
                      ];
                    }
                    return [];
                  })
                : [];
            duckduckgo = {
              abstract: truncate(
                String(j.AbstractText ?? j.Abstract ?? ""),
                2000,
              ),
              abstractUrl: j.AbstractURL,
              answer: j.Answer,
              definition: j.Definition,
              related,
            };
          } else {
            duckduckgo = {
              error: true,
              status: res.status,
              body: truncate(text, 1500),
            };
          }
        } catch (e) {
          duckduckgo = {
            error: String(e instanceof Error ? e.message : e),
          };
        }

        try {
          const res = await fetchWithTimeout(wikiUrl.toString(), {
            headers: {
              Accept: "application/json",
              "User-Agent": "CaulfieldAI/1.0 (educational; contact: site)",
            },
          });
          const text = await res.text();
          if (res.ok) {
            const j = JSON.parse(text) as {
              query?: {
                search?: Array<{ title: string; snippet: string }>;
              };
            };
            const hits = j.query?.search?.slice(0, 5) ?? [];
            wikipedia = {
              hits: hits.map((h) => ({
                title: h.title,
                snippet: truncate(
                  h.snippet.replace(/<[^>]+>/g, ""),
                  400,
                ),
              })),
            };
          } else {
            wikipedia = { error: true, status: res.status };
          }
        } catch (e) {
          wikipedia = {
            error: String(e instanceof Error ? e.message : e),
          };
        }

        return truncatePayload({ query, duckduckgo, wikipedia });
      },
    }),
  };

  return { tools };
};
