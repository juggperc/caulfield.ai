import type { ResearchSnippet, ResearchSnippetSource } from "./research-types";
import { htmlToPlainText, isPublicHttpUrl } from "./research-url-utils";
import { tool } from "ai";
import { z } from "zod";

const UA =
  "caulfield.ai-research/1.0 (research agent; contact: https://github.com/juggperc/caulfield.ai)";

const MAX_FETCH_BYTES = 400_000;
const MAX_EXCERPT = 12_000;

type Collector = {
  readonly topic: string;
  readonly snippets: ResearchSnippet[];
};

const addSnippet = (
  collector: Collector,
  input: {
    title: string;
    body: string;
    sourceType: ResearchSnippetSource;
    sourceUrl: string;
  },
) => {
  const now = Date.now();
  const s: ResearchSnippet = {
    id: crypto.randomUUID(),
    topic: collector.topic,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl.slice(0, 2000),
    title: input.title.slice(0, 500),
    body: input.body.slice(0, 50_000),
    createdAt: now,
  };
  collector.snippets.push(s);
  return s;
};

const wikiSearch = async (query: string) => {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("list", "search");
  u.searchParams.set("format", "json");
  u.searchParams.set("origin", "*");
  u.searchParams.set("srsearch", query);
  u.searchParams.set("srlimit", "5");
  const res = await fetch(u.toString(), { headers: { "User-Agent": UA } });
  if (!res.ok) return { error: `Wikipedia search HTTP ${res.status}` };
  const data = (await res.json()) as {
    query?: { search?: { title: string }[] };
  };
  const hits = data.query?.search ?? [];
  return { titles: hits.map((h) => h.title) };
};

const wikiExtract = async (title: string) => {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  u.searchParams.set("action", "query");
  u.searchParams.set("format", "json");
  u.searchParams.set("origin", "*");
  u.searchParams.set("prop", "extracts");
  u.searchParams.set("exintro", "true");
  u.searchParams.set("explaintext", "true");
  u.searchParams.set("titles", title);
  const res = await fetch(u.toString(), { headers: { "User-Agent": UA } });
  if (!res.ok) return { error: `Wikipedia extract HTTP ${res.status}` };
  const data = (await res.json()) as {
    query?: {
      pages?: Record<string, { extract?: string; missing?: boolean }>;
    };
  };
  const pages = data.query?.pages ?? {};
  const first = Object.values(pages)[0];
  if (!first || first.missing) {
    return { error: "Page not found" };
  }
  const extract = (first.extract ?? "").trim();
  const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  return { extract, pageUrl };
};

const arxivSearch = async (query: string) => {
  const u = new URL("http://export.arxiv.org/api/query");
  u.searchParams.set("search_query", `all:${query}`);
  u.searchParams.set("start", "0");
  u.searchParams.set("max_results", "6");
  const res = await fetch(u.toString(), { headers: { "User-Agent": UA } });
  if (!res.ok) return { error: `arXiv HTTP ${res.status}` };
  const xml = await res.text();
  const entries = xml.split("<entry>").slice(1);
  const results: { id: string; title: string; summary: string }[] = [];
  for (const block of entries) {
    const idMatch = block.match(/<id>([^<]+)<\/id>/);
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const sumMatch = block.match(/<summary>([\s\S]*?)<\/summary>/);
    if (!idMatch || !titleMatch) continue;
    results.push({
      id: idMatch[1].trim(),
      title: titleMatch[1].replace(/\s+/g, " ").trim(),
      summary: sumMatch
        ? sumMatch[1].replace(/\s+/g, " ").trim().slice(0, 1200)
        : "",
    });
  }
  return { results };
};

export const createResearchAgentTools = (collector: Collector) => {
  const tools = {
    research_save_snippet: tool({
      description:
        "Save a distilled research excerpt with citation. Call after you obtain substantive text from web, Wikipedia, or arXiv.",
      inputSchema: z.object({
        title: z.string().describe("Short heading for this finding"),
        body: z
          .string()
          .describe("The excerpt, summary, or key facts (keep focused)"),
        sourceType: z.enum(["web", "wikipedia", "arxiv"]),
        sourceUrl: z.string().describe("Canonical URL or arXiv abs link"),
      }),
      execute: async ({ title, body, sourceType, sourceUrl }) => {
        const s = addSnippet(collector, {
          title,
          body,
          sourceType,
          sourceUrl,
        });
        return {
          ok: true as const,
          snippetId: s.id,
          savedCount: collector.snippets.length,
        };
      },
    }),

    research_fetch_url: tool({
      description:
        "Fetch a public http(s) page and return a plain-text excerpt (chunked). Use for specific URLs; follow up with another call and higher startOffset if truncated.",
      inputSchema: z.object({
        url: z.string().url().describe("Public http(s) URL"),
        startOffset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe("Character offset for chunked reads"),
        maxChars: z
          .number()
          .int()
          .min(800)
          .max(MAX_EXCERPT)
          .default(6000)
          .describe("How many characters to return from startOffset"),
      }),
      execute: async ({ url, startOffset, maxChars }) => {
        if (!isPublicHttpUrl(url)) {
          return { error: "URL not allowed (private or non-http)" };
        }
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 14_000);
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": UA, Accept: "text/html,text/plain,*/*" },
            signal: ctrl.signal,
            redirect: "follow",
          });
          clearTimeout(t);
          if (!res.ok) return { error: `HTTP ${res.status}` };
          const buf = await res.arrayBuffer();
          const slice = buf.byteLength > MAX_FETCH_BYTES
            ? buf.slice(0, MAX_FETCH_BYTES)
            : buf;
          const text = new TextDecoder("utf-8", { fatal: false }).decode(
            slice,
          );
          const plain = htmlToPlainText(text);
          const totalLen = plain.length;
          const sliceText = plain.slice(
            startOffset,
            startOffset + maxChars,
          );
          return {
            url,
            totalLen,
            startOffset,
            returnedChars: sliceText.length,
            truncated: startOffset + sliceText.length < totalLen,
            excerpt: sliceText,
          };
        } catch (e) {
          clearTimeout(t);
          const msg = e instanceof Error ? e.message : "fetch failed";
          return { error: msg };
        }
      },
    }),

    research_wikipedia: tool({
      description:
        "Search Wikipedia and return intro extracts for top hits (plain text).",
      inputSchema: z.object({
        query: z.string().describe("Topic or keywords"),
      }),
      execute: async ({ query }) => {
        const q = query.trim();
        if (!q) return { error: "Empty query" };
        const search = await wikiSearch(q);
        if ("error" in search) return search;
        const titles = search.titles;
        if (titles.length === 0) return { results: [] as const };

        const results: {
          title: string;
          extract: string;
          pageUrl: string;
        }[] = [];
        for (const title of titles.slice(0, 3)) {
          const ex = await wikiExtract(title);
          if ("error" in ex) continue;
          results.push({
            title,
            extract: ex.extract.slice(0, 8000),
            pageUrl: ex.pageUrl,
          });
        }
        return { results };
      },
    }),

    research_arxiv_search: tool({
      description: "Search arXiv for papers matching a query.",
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        const q = query.trim();
        if (!q) return { error: "Empty query" };
        return arxivSearch(q);
      },
    }),

    research_arxiv_abstract: tool({
      description:
        "Fetch abstract and metadata for one arXiv result (by http arxiv.org/abs/... id URL or arXiv id).",
      inputSchema: z.object({
        arxivIdOrUrl: z.string().describe("e.g. 2401.00001 or full abs URL"),
      }),
      execute: async ({ arxivIdOrUrl }) => {
        let id = arxivIdOrUrl.trim();
        const absMatch = id.match(/arxiv\.org\/abs\/([^?#]+)/i);
        if (absMatch) id = absMatch[1];
        id = id.replace(/^arxiv:/i, "").trim();
        if (!id) return { error: "Invalid arXiv id" };
        const u = new URL("http://export.arxiv.org/api/query");
        u.searchParams.set("id_list", id);
        const res = await fetch(u.toString(), { headers: { "User-Agent": UA } });
        if (!res.ok) return { error: `arXiv HTTP ${res.status}` };
        const xml = await res.text();
        const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/);
        const sumMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/);
        const idMatch = xml.match(/<id>([^<]+)<\/id>/);
        const title = titleMatch
          ? titleMatch[1].replace(/\s+/g, " ").trim()
          : id;
        const summary = sumMatch
          ? sumMatch[1].replace(/\s+/g, " ").trim()
          : "";
        const link = idMatch?.[1]?.trim() ?? `https://arxiv.org/abs/${id}`;
        return { id, title, abstract: summary.slice(0, 12_000), absUrl: link };
      },
    }),
  };

  return { tools };
};
