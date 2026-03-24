import type { StoredChatMode } from "@/features/ai-agent/storage";
import { z } from "zod";
import type { PlaybookApply, PlaybookApplyDraft, PlaybookEntry } from "./types";

const STORAGE_KEY = "caulfield.playbooks.user.v1";
export const MAX_USER_PLAYBOOKS = 30;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 200;
const MAX_PROMPT = 8000;

const applySchema = z
  .object({
    chatMode: z.enum(["thinking", "free"]).optional(),
    webSearch: z.boolean().optional(),
    ragMemory: z.boolean().optional(),
    ragResearch: z.boolean().optional(),
  })
  .strict();

const entrySchema = z
  .object({
    id: z.string().min(1).max(64),
    title: z.string().min(1).max(MAX_TITLE),
    description: z.string().max(MAX_DESCRIPTION).optional(),
    prompt: z.string().min(1).max(MAX_PROMPT),
    apply: applySchema.optional(),
  })
  .strict();

const listSchema = z.array(entrySchema);

export const readUserPlaybooks = (): PlaybookEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const r = listSchema.safeParse(parsed);
    if (!r.success) return [];
    return r.data.map((row) => ({ ...row, builtIn: false }));
  } catch {
    return [];
  }
};

export const writeUserPlaybooks = (entries: PlaybookEntry[]): void => {
  if (typeof window === "undefined") return;
  const trimmed = entries.slice(0, MAX_USER_PLAYBOOKS).map((e) => ({
    id: e.id,
    title: e.title.slice(0, MAX_TITLE),
    description: e.description?.slice(0, MAX_DESCRIPTION),
    prompt: e.prompt.slice(0, MAX_PROMPT),
    apply: e.apply,
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota */
  }
};

export const addUserPlaybook = (entry: Omit<PlaybookEntry, "builtIn">): PlaybookEntry[] => {
  const list = readUserPlaybooks();
  if (list.length >= MAX_USER_PLAYBOOKS) return list;
  const next: PlaybookEntry = {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    builtIn: false,
  };
  return [...list, next];
};

export const updateUserPlaybook = (
  id: string,
  patch: Partial<Pick<PlaybookEntry, "title" | "description" | "prompt" | "apply">>,
): PlaybookEntry[] => {
  const list = readUserPlaybooks();
  return list.map((e) => {
    if (e.id !== id) return e;
    const title = patch.title ?? e.title;
    const description = patch.description ?? e.description;
    const prompt = patch.prompt ?? e.prompt;
    if (!("apply" in patch)) {
      return { ...e, title, description, prompt };
    }
    if (patch.apply === undefined) {
      return {
        id: e.id,
        title,
        description,
        prompt,
        builtIn: e.builtIn,
      };
    }
    return { ...e, title, description, prompt, apply: patch.apply };
  });
};

export const removeUserPlaybook = (id: string): PlaybookEntry[] =>
  readUserPlaybooks().filter((e) => e.id !== id);

export const playbookFieldLimits = {
  maxTitle: MAX_TITLE,
  maxDescription: MAX_DESCRIPTION,
  maxPrompt: MAX_PROMPT,
} as const;

export type UserPlaybookDraft = {
  title: string;
  description: string;
  prompt: string;
  chatMode: "inherit" | StoredChatMode;
  webSearch: "inherit" | "on" | "off";
  ragMemory: "inherit" | "on" | "off";
  ragResearch: "inherit" | "on" | "off";
};

export const draftToApply = (d: UserPlaybookDraft): PlaybookApply | undefined => {
  const out: PlaybookApplyDraft = {};
  if (d.chatMode !== "inherit") out.chatMode = d.chatMode;
  if (d.webSearch === "on") out.webSearch = true;
  if (d.webSearch === "off") out.webSearch = false;
  if (d.ragMemory === "on") out.ragMemory = true;
  if (d.ragMemory === "off") out.ragMemory = false;
  if (d.ragResearch === "on") out.ragResearch = true;
  if (d.ragResearch === "off") out.ragResearch = false;
  if (Object.keys(out).length === 0) return undefined;
  return out;
};

export const entryToDraft = (e: PlaybookEntry): UserPlaybookDraft => {
  const a = e.apply;
  return {
    title: e.title,
    description: e.description ?? "",
    prompt: e.prompt,
    chatMode: a?.chatMode ?? "inherit",
    webSearch:
      a?.webSearch === true ? "on" : a?.webSearch === false ? "off" : "inherit",
    ragMemory:
      a?.ragMemory === true ? "on" : a?.ragMemory === false ? "off" : "inherit",
    ragResearch:
      a?.ragResearch === true ? "on" : a?.ragResearch === false ? "off" : "inherit",
  };
};
