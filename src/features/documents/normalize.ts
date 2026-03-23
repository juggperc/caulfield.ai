import { emptyTipTapDoc, type WorkspaceDoc } from "./types";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const normalizeWorkspaceDoc = (raw: unknown): WorkspaceDoc | null => {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : null;
  const title = typeof raw.title === "string" ? raw.title : "Untitled";
  const createdAt =
    typeof raw.createdAt === "number" ? raw.createdAt : Date.now();
  const updatedAt =
    typeof raw.updatedAt === "number" ? raw.updatedAt : createdAt;
  const revision =
    typeof raw.revision === "number" && Number.isFinite(raw.revision)
      ? Math.max(0, Math.floor(raw.revision))
      : 0;
  const contentJson = raw.contentJson;
  if (!id) return null;
  if (!isRecord(contentJson) || typeof contentJson.type !== "string") {
    return {
      id,
      title,
      createdAt,
      updatedAt,
      revision,
      contentJson: emptyTipTapDoc(),
    };
  }
  return {
    id,
    title,
    createdAt,
    updatedAt,
    revision,
    contentJson: contentJson as WorkspaceDoc["contentJson"],
  };
};

export const normalizeWorkspaceDocList = (raw: unknown): WorkspaceDoc[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => normalizeWorkspaceDoc(item))
    .filter((d): d is WorkspaceDoc => d !== null);
};
