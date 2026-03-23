import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { tool } from "ai";
import { z } from "zod";

const MAX_README_CHARS = 12_000;
const MAX_FILE_CHARS = 8_000;
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

const githubHeaders = (token?: string): HeadersInit => {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "CaulfieldAI/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const t = token?.trim();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

const encodeRepoPath = (path: string) =>
  path
    .replace(/^\/+/, "")
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

export const createGithubToolset = (opts: { token?: string }) => {
  const headers = githubHeaders(opts.token);

  const tools = {
    github_search_repositories: tool({
      description:
        "Search public GitHub repositories. Optional token increases rate limits; works without a token at lower quota.",
      inputSchema: z.object({
        query: z.string().min(1).max(256).describe("Search query (GitHub syntax)"),
        perPage: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe("Results per page (default 8)"),
      }),
      execute: async ({ query, perPage = 8 }) => {
        const url = new URL("https://api.github.com/search/repositories");
        url.searchParams.set("q", query);
        url.searchParams.set("per_page", String(perPage));
        const res = await fetchWithTimeout(url.toString(), { headers });
        const text = await res.text();
        if (!res.ok) {
          return {
            error: true,
            status: res.status,
            body: text.slice(0, 2000),
          };
        }
        try {
          const data = JSON.parse(text) as {
            items?: Array<{
              full_name: string;
              html_url: string;
              description: string | null;
              stargazers_count: number;
              language: string | null;
            }>;
          };
          const items = (data.items ?? []).map((it) => ({
            full_name: it.full_name,
            html_url: it.html_url,
            description: it.description,
            stargazers_count: it.stargazers_count,
            language: it.language,
          }));
          return truncateJson({ total_returned: items.length, items });
        } catch {
          return { raw: text.slice(0, MAX_TOOL_JSON_CHARS) };
        }
      },
    }),

    github_get_repository_readme: tool({
      description:
        "Fetch the default README for a repository (decoded text). Owner and repo are the path segments (e.g. owner vercel, repo next.js).",
      inputSchema: z.object({
        owner: z.string().min(1).max(120),
        repo: z.string().min(1).max(120),
      }),
      execute: async ({ owner, repo }) => {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`;
        const res = await fetchWithTimeout(url, { headers });
        const text = await res.text();
        if (!res.ok) {
          return {
            error: true,
            status: res.status,
            body: text.slice(0, 2000),
          };
        }
        try {
          const data = JSON.parse(text) as {
            content?: string;
            encoding?: string;
            html_url?: string;
          };
          if (data.encoding !== "base64" || !data.content) {
            return truncateJson({ message: "Unexpected README payload", data });
          }
          const decoded = Buffer.from(data.content, "base64").toString(
            "utf8",
          );
          return truncateJson({
            html_url: data.html_url,
            content:
              decoded.length > MAX_README_CHARS
                ? `${decoded.slice(0, MAX_README_CHARS)}…`
                : decoded,
          });
        } catch {
          return { raw: text.slice(0, MAX_TOOL_JSON_CHARS) };
        }
      },
    }),

    github_get_repository_file: tool({
      description:
        "Fetch a single file from a repository via the Contents API (text files). Path is relative to repo root (e.g. package.json).",
      inputSchema: z.object({
        owner: z.string().min(1).max(120),
        repo: z.string().min(1).max(120),
        path: z.string().min(1).max(500),
      }),
      execute: async ({ owner, repo, path }) => {
        const encPath = encodeRepoPath(path);
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encPath}`;
        const res = await fetchWithTimeout(url, { headers });
        const text = await res.text();
        if (!res.ok) {
          return {
            error: true,
            status: res.status,
            body: text.slice(0, 2000),
          };
        }
        try {
          const data = JSON.parse(text) as {
            type?: string;
            content?: string;
            encoding?: string;
            message?: string;
            html_url?: string;
          };
          if (data.type !== "file") {
            return {
              error: true,
              message: "Path is not a single file (directory or submodule).",
            };
          }
          if (data.encoding !== "base64" || !data.content) {
            return truncateJson({ message: "Unexpected file payload", data });
          }
          const decoded = Buffer.from(data.content, "base64").toString("utf8");
          return truncateJson({
            path,
            html_url: data.html_url,
            content:
              decoded.length > MAX_FILE_CHARS
                ? `${decoded.slice(0, MAX_FILE_CHARS)}…`
                : decoded,
          });
        } catch {
          return { raw: text.slice(0, MAX_TOOL_JSON_CHARS) };
        }
      },
    }),
  };

  return { tools };
};
