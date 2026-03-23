import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { tool } from "ai";
import { z } from "zod";

const CONTEXT7_BASE = "https://context7.com/api/v2";
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

export const createContext7Toolset = (apiKey: string) => {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  const tools = {
    context7_search_libraries: tool({
      description:
        "Search Context7 for documentation libraries by name. Use before context7_get_context to obtain libraryId (e.g. /vercel/next.js).",
      inputSchema: z.object({
        libraryName: z
          .string()
          .describe('Library name to find, e.g. "next.js", "react"'),
        query: z
          .string()
          .describe("User task or question for relevance ranking"),
      }),
      execute: async ({ libraryName, query }) => {
        const url = new URL(`${CONTEXT7_BASE}/libs/search`);
        url.searchParams.set("libraryName", libraryName);
        url.searchParams.set("query", query);
        const res = await fetchWithTimeout(url.toString(), {
          headers,
          method: "GET",
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

    context7_get_context: tool({
      description:
        "Fetch documentation context for a Context7 libraryId (from context7_search_libraries). Returns snippets for the given query.",
      inputSchema: z.object({
        libraryId: z
          .string()
          .describe("Library id from search, e.g. /vercel/next.js"),
        query: z.string().describe("Specific documentation question"),
        type: z.enum(["json", "txt"]).optional().describe("Response format"),
      }),
      execute: async ({ libraryId, query, type }) => {
        const url = new URL(`${CONTEXT7_BASE}/context`);
        url.searchParams.set("libraryId", libraryId);
        url.searchParams.set("query", query);
        if (type) url.searchParams.set("type", type);
        const res = await fetchWithTimeout(url.toString(), {
          headers,
          method: "GET",
        });
        const text = await res.text();
        if (!res.ok) {
          return { error: true, status: res.status, body: text.slice(0, 2000) };
        }
        if (type === "txt") {
          return truncateJson({ format: "txt", content: text });
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
