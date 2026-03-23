import type { BrandIconSource } from "@/components/BrandIcon";
import {
  siFigma,
  siGithubcopilot,
  siHuggingface,
  siLinear,
  siNotion,
} from "simple-icons";

/** Teal mark for Canva (brand color; simplified geometry — not in simple-icons). */
export const siCanvaCustom: BrandIconSource = {
  title: "Canva",
  hex: "00C4CC",
  path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7z",
};

/** Firecrawl mark (approximation); brand not in simple-icons. */
export const siFirecrawlCustom: BrandIconSource = {
  title: "Firecrawl",
  hex: "F97316",
  path: "M12 2l2.2 6.8h7l-5.7 4.1 2.2 6.9-5.7-4.1-5.7 4.1 2.2-6.9L2.8 8.8h7L12 2z",
};

export const KD_MCP_ARTICLE_URL =
  "https://www.kdnuggets.com/7-free-remote-mcps-you-must-use-as-a-developer";

export type RemoteMcpCatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly brand: BrandIconSource;
  readonly primaryUrl: string;
  readonly linkLabel: string;
};

export const REMOTE_MCP_CATALOG: readonly RemoteMcpCatalogEntry[] = [
  {
    id: "github-mcp",
    name: "GitHub (remote MCP)",
    description:
      "GitHub’s hosted MCP for Copilot-compatible clients — repos, issues, and PRs via OAuth.",
    brand: siGithubcopilot,
    primaryUrl: "https://api.githubcopilot.com/mcp/",
    linkLabel: "MCP endpoint",
  },
  {
    id: "canva",
    name: "Canva",
    description:
      "Design templates, exports, and creative workflows from MCP-capable editors.",
    brand: siCanvaCustom,
    primaryUrl: "https://mcp.canva.com/mcp",
    linkLabel: "Canva MCP",
  },
  {
    id: "figma",
    name: "Figma",
    description:
      "Frames, variables, and layout metadata for design-to-code workflows (open beta).",
    brand: siFigma,
    primaryUrl: "https://mcp.figma.com/mcp",
    linkLabel: "Figma MCP",
  },
  {
    id: "notion",
    name: "Notion",
    description:
      "Search, create, and update workspace pages and databases via OAuth.",
    brand: siNotion,
    primaryUrl: "https://mcp.notion.com/mcp",
    linkLabel: "Notion MCP",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    description:
      "Hub models, datasets, Spaces, and Gradio tools from MCP clients.",
    brand: siHuggingface,
    primaryUrl: "https://huggingface.co/mcp?login",
    linkLabel: "Hugging Face MCP",
  },
  {
    id: "linear",
    name: "Linear",
    description:
      "Issues, projects, and teams for engineering workflow automation.",
    brand: siLinear,
    primaryUrl: "https://mcp.linear.app/sse",
    linkLabel: "Linear MCP",
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    description:
      "Crawl, scrape, and search the web with structured output for AI agents (API / MCP).",
    brand: siFirecrawlCustom,
    primaryUrl: "https://github.com/firecrawl/firecrawl-mcp",
    linkLabel: "Firecrawl MCP (GitHub)",
  },
];
