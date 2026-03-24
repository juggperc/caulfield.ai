import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { tool } from "ai";
import { z } from "zod";

const MAX_TOOL_JSON_CHARS = 14_000;

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

export type WebSearchSource = {
  title: string;
  url: string;
  snippet: string;
};

const WIKI_UA = "CaulfieldAI/1.0 (educational; contact: site)";

const fetchWikiExtracts = async (
  titles: string[],
): Promise<Record<string, string>> => {
  if (titles.length === 0) return {};
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "extracts");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exlimit", String(titles.length));
  url.searchParams.set("titles", titles.join("|"));
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  try {
    const res = await fetchWithTimeout(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": WIKI_UA },
    });
    if (!res.ok) return {};
    const j = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string }> };
    };
    const out: Record<string, string> = {};
    for (const page of Object.values(j.query?.pages ?? {})) {
      if (page.title && page.extract) {
        out[page.title] = truncate(page.extract, 1500);
      }
    }
    return out;
  } catch {
    return {};
  }
};

export const createNativeSearchToolset = () => {
  const tools = {
    native_web_lookup: tool({
      description:
        "Look up public facts using DuckDuckGo instant data and English Wikipedia search + extracts (no third-party API key). Returns structured sources for inline citation. Use for definitions, summaries, current events, and article content; prefer notes/tools for private data.",
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
        wikiUrl.searchParams.set("srlimit", "8");
        wikiUrl.searchParams.set("origin", "*");

        let duckduckgo: unknown = { error: "unavailable" };
        let wikipedia: unknown = { error: "unavailable" };
        const sources: WebSearchSource[] = [];

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
                ? rawTopics.slice(0, 12).flatMap((x) => {
                    if (typeof x === "object" && x !== null && "Text" in x) {
                      const t = x as DdgTopic;
                      return [{ text: t.Text, url: t.FirstURL }];
                    }
                    return [];
                  })
                : [];

            const abstractText = truncate(
              String(j.AbstractText ?? j.Abstract ?? ""),
              2000,
            );
            const abstractUrl = j.AbstractURL
              ? String(j.AbstractURL)
              : undefined;

            duckduckgo = {
              abstract: abstractText,
              abstractSource: j.AbstractSource,
              abstractUrl,
              heading: j.Heading,
              type: j.Type,
              answer: j.Answer,
              definition: j.Definition,
              infobox: j.Infobox,
              related,
            };

            if (abstractText && abstractUrl) {
              sources.push({
                title: String(j.Heading ?? j.AbstractSource ?? query),
                url: abstractUrl,
                snippet: truncate(abstractText, 200),
              });
            }
            for (const r of related.slice(0, 4)) {
              if (r.url && r.text) {
                sources.push({
                  title: truncate(String(r.text), 80),
                  url: String(r.url),
                  snippet: truncate(String(r.text), 160),
                });
              }
            }
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
            headers: { Accept: "application/json", "User-Agent": WIKI_UA },
          });
          const text = await res.text();
          if (res.ok) {
            const j = JSON.parse(text) as {
              query?: {
                search?: Array<{ title: string; snippet: string }>;
              };
            };
            const hits = j.query?.search?.slice(0, 8) ?? [];
            const topTitles = hits.slice(0, 3).map((h) => h.title);
            const extracts = await fetchWikiExtracts(topTitles);

            wikipedia = {
              hits: hits.map((h) => ({
                title: h.title,
                snippet: truncate(h.snippet.replace(/<[^>]+>/g, ""), 400),
                extract: extracts[h.title] ?? null,
              })),
            };

            for (const h of hits.slice(0, 6)) {
              const wikiPageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}`;
              const extract = extracts[h.title];
              sources.push({
                title: h.title,
                url: wikiPageUrl,
                snippet: extract
                  ? truncate(extract, 200)
                  : truncate(h.snippet.replace(/<[^>]+>/g, ""), 200),
              });
            }
          } else {
            wikipedia = { error: true, status: res.status };
          }
        } catch (e) {
          wikipedia = {
            error: String(e instanceof Error ? e.message : e),
          };
        }

        return truncatePayload({ query, duckduckgo, wikipedia, sources });
      },
    }),
  };

  return { tools };
};
