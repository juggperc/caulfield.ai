import { z } from "zod";
import {
  POPULAR_CHAT_MODEL_IDS,
  POPULAR_EMBEDDING_MODEL_IDS,
} from "./popular-models";
import type {
  NormalizedOpenRouterModel,
  OpenRouterModelKind,
  OpenRouterModelsPayload,
} from "./model-types";

const ArchitectureSchema = z
  .object({
    modality: z.string().optional().nullable(),
    input_modalities: z.array(z.string()).optional(),
    output_modalities: z.array(z.string()).optional(),
  })
  .passthrough();

const RawModelSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    context_length: z.number().optional().nullable(),
    architecture: ArchitectureSchema.optional().nullable(),
  })
  .passthrough();

const RawListSchema = z.object({
  data: z.array(RawModelSchema),
});

const OPENROUTER_CHAT_MODELS = "https://openrouter.ai/api/v1/models";
const OPENROUTER_EMBEDDING_MODELS =
  "https://openrouter.ai/api/v1/embeddings/models";

const REVALIDATE_SEC = 900;

const normalizeOne = (raw: z.infer<typeof RawModelSchema>): NormalizedOpenRouterModel => {
  const id = raw.id.trim();
  const providerSlug = id.includes("/") ? id.slice(0, id.indexOf("/")) : id;
  const name = (raw.name?.trim() || id).trim();
  const ctx =
    typeof raw.context_length === "number" && Number.isFinite(raw.context_length)
      ? raw.context_length
      : null;
  const modality = raw.architecture?.modality?.trim() ?? null;
  return {
    id,
    name,
    contextLength: ctx,
    providerSlug,
    modality,
  };
};

const isChatModel = (raw: z.infer<typeof RawModelSchema>): boolean => {
  const outs = raw.architecture?.output_modalities ?? [];
  const mod = raw.architecture?.modality?.toLowerCase() ?? "";
  if (mod.includes("embeddings")) return false;
  if (Array.isArray(outs) && outs.includes("text")) return true;
  if (mod.includes("->text")) return true;
  return false;
};

const isEmbeddingModel = (raw: z.infer<typeof RawModelSchema>): boolean => {
  const mod = raw.architecture?.modality?.toLowerCase() ?? "";
  if (mod.includes("embeddings")) return true;
  const outs = raw.architecture?.output_modalities ?? [];
  return outs.includes("embeddings");
};

const fetchJson = async (url: string): Promise<unknown> => {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SEC },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<unknown>;
};

const partitionPopular = (
  all: NormalizedOpenRouterModel[],
  popularIds: readonly string[],
): { popular: NormalizedOpenRouterModel[]; rest: NormalizedOpenRouterModel[] } => {
  const byId = new Map(all.map((m) => [m.id, m]));
  const popular: NormalizedOpenRouterModel[] = [];
  for (const id of popularIds) {
    const row = byId.get(id);
    if (row) popular.push(row);
  }
  const popularSet = new Set(popular.map((p) => p.id));
  const rest = all.filter((m) => !popularSet.has(m.id));
  rest.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  return { popular, rest };
};

export const buildModelsPayload = async (
  kind: OpenRouterModelKind,
): Promise<OpenRouterModelsPayload> => {
  const url = kind === "chat" ? OPENROUTER_CHAT_MODELS : OPENROUTER_EMBEDDING_MODELS;
  const json = await fetchJson(url);
  const parsed = RawListSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid OpenRouter models response");
  }

  const rawRows = parsed.data.data;
  const filtered =
    kind === "chat"
      ? rawRows.filter(isChatModel)
      : rawRows.filter(isEmbeddingModel);

  const models = filtered.map(normalizeOne);
  const unique = new Map<string, NormalizedOpenRouterModel>();
  for (const m of models) {
    unique.set(m.id, m);
  }
  const all = [...unique.values()];

  const popularIds =
    kind === "chat" ? POPULAR_CHAT_MODEL_IDS : POPULAR_EMBEDDING_MODEL_IDS;
  const { popular, rest } = partitionPopular(all, popularIds);

  return {
    kind,
    models: all,
    popular,
    rest,
    fetchedAt: new Date().toISOString(),
  };
};
