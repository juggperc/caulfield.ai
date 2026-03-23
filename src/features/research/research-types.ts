export type ResearchSnippetSource = "web" | "wikipedia" | "arxiv";

export type ResearchSnippet = {
  readonly id: string;
  readonly topic: string;
  readonly sourceType: ResearchSnippetSource;
  readonly sourceUrl: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: number;
};

export const researchSnippetFromUnknown = (
  value: unknown,
): ResearchSnippet | null => {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  if (typeof o.topic !== "string") return null;
  if (o.sourceType !== "web" && o.sourceType !== "wikipedia" && o.sourceType !== "arxiv") {
    return null;
  }
  if (typeof o.sourceUrl !== "string") return null;
  if (typeof o.title !== "string") return null;
  if (typeof o.body !== "string") return null;
  if (typeof o.createdAt !== "number") return null;
  return {
    id: o.id,
    topic: o.topic,
    sourceType: o.sourceType,
    sourceUrl: o.sourceUrl,
    title: o.title,
    body: o.body,
    createdAt: o.createdAt,
  };
};
