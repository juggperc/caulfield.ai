import type { CustomBrandIcon } from "@/components/BrandIcon";
import type { SimpleIcon } from "simple-icons";
import {
  siAlibabadotcom,
  siAnthropic,
  siGithub,
  siGooglegemini,
  siMeta,
  siMinimax,
  siMistralai,
  siNvidia,
  siOllama,
  siOpenrouter,
  siPerplexity,
  siXiaomi,
} from "simple-icons";

/** OpenAI mark (vendor not exposed as `siOpenai` in current simple-icons). */
const CUSTOM_OPENAI: CustomBrandIcon = {
  title: "OpenAI",
  hex: "412991",
  path: "M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.746-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .785 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l2.021-1.163 2.02 1.163v2.327l-2.015 1.163-2.016-1.163v-2.327z",
};

const CUSTOM_XAI: CustomBrandIcon = {
  title: "xAI",
  hex: "000000",
  path: "M4 4h4.5L12 10.5 15.5 4H20l-5.5 10L20 20h-4.5L12 13.5 8.5 20H4l5.5-6L4 4z",
};

export type ProviderIconResolved =
  | { readonly kind: "brand"; readonly source: SimpleIcon | CustomBrandIcon }
  | { readonly kind: "generic" };

const ALIASES: Record<string, string> = {
  "meta-llama": "meta",
  "meta-llama-2": "meta",
  mistral: "mistralai",
};

const MAP: Record<string, SimpleIcon | CustomBrandIcon> = {
  openai: CUSTOM_OPENAI,
  anthropic: siAnthropic,
  google: siGooglegemini,
  "meta-llama": siMeta,
  meta: siMeta,
  mistralai: siMistralai,
  mistral: siMistralai,
  perplexity: siPerplexity,
  "x-ai": CUSTOM_XAI,
  xai: CUSTOM_XAI,
  nvidia: siNvidia,
  ollama: siOllama,
  qwen: siAlibabadotcom,
  alibaba: siAlibabadotcom,
  github: siGithub,
  openrouter: siOpenrouter,
  minimax: siMinimax,
  xiaomi: siXiaomi,
};

export const resolveProviderIcon = (providerSlug: string): ProviderIconResolved => {
  const raw = providerSlug.trim().toLowerCase();
  if (!raw) return { kind: "generic" };
  const key = ALIASES[raw] ?? raw;
  const source = MAP[key];
  if (source) return { kind: "brand", source };
  return { kind: "generic" };
};
