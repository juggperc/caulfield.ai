import { scopedStorageKey } from "@/features/auth/storage-scope";
import {
  researchSnippetFromUnknown,
  type ResearchSnippet,
} from "./research-types";

const STORAGE_KEY_BASE = "caulfield.research.v1";

export const getResearchStorageKey = (): string =>
  scopedStorageKey(STORAGE_KEY_BASE);

export const loadResearchSnippets = (): ResearchSnippet[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getResearchStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ResearchSnippet[] = [];
    for (const item of parsed) {
      const s = researchSnippetFromUnknown(item);
      if (s) out.push(s);
    }
    return out;
  } catch {
    return [];
  }
};

export const saveResearchSnippets = (snippets: ResearchSnippet[]): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getResearchStorageKey(), JSON.stringify(snippets));
  } catch {
    /* quota */
  }
};
