export type OpenRouterModelKind = "chat" | "embedding";

export type NormalizedOpenRouterModel = {
  readonly id: string;
  readonly name: string;
  readonly contextLength: number | null;
  readonly providerSlug: string;
  readonly modality: string | null;
};

export type OpenRouterModelsPayload = {
  readonly kind: OpenRouterModelKind;
  readonly models: NormalizedOpenRouterModel[];
  readonly popular: NormalizedOpenRouterModel[];
  readonly rest: NormalizedOpenRouterModel[];
  readonly fetchedAt: string;
};
