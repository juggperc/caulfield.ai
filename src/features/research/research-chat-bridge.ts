import type { ResearchSnippet } from "./research-types";

let getSnippets: () => ResearchSnippet[] = () => [];

export const registerResearchGetter = (fn: () => ResearchSnippet[]) => {
  getSnippets = fn;
};

export const getResearchSnapshot = (): ResearchSnippet[] => getSnippets();
