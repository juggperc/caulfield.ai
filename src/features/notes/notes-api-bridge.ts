import type { Note } from "./types";

let getNotes: () => Note[] = () => [];

export const registerNotesGetter = (fn: () => Note[]) => {
  getNotes = fn;
};

export const getNotesSnapshot = (): Note[] => getNotes();
