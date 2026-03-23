import type { WorkspaceSheet } from "./sheets-types";

export type ActiveSheetPayload = {
  id: string;
  title: string;
  revision: number;
  rows: string[][];
};

export type WorkspaceSheetBrief = {
  id: string;
  title: string;
  revision: number;
  csvPreview: string;
};

type SheetsSnapshot = {
  getAll: () => WorkspaceSheet[];
  getSelectedId: () => string | null;
};

const empty: SheetsSnapshot = {
  getAll: () => [],
  getSelectedId: () => null,
};

let sheetsSnap: SheetsSnapshot = empty;

export const registerSheetsChatSnapshot = (next: SheetsSnapshot) => {
  sheetsSnap = next;
};

export const resetSheetsChatSnapshot = () => {
  sheetsSnap = empty;
};

const truncateRows = (
  rows: string[][],
  maxR: number,
  maxC: number,
): string[][] =>
  rows.slice(0, maxR).map((r) => r.slice(0, maxC));

export const getSheetsChatPayload = (): {
  activeSheet: ActiveSheetPayload | undefined;
  workspaceSheets: WorkspaceSheetBrief[];
} => {
  const all = sheetsSnap.getAll();
  const sid = sheetsSnap.getSelectedId();
  const active = sid
    ? all.find((x) => x.id === sid)
    : all.length > 0
      ? all[0]
      : undefined;

  const brief: WorkspaceSheetBrief[] = all.map((s) => ({
    id: s.id,
    title: s.title,
    revision: s.revision,
    csvPreview: s.rows
      .slice(0, 12)
      .map((r) => r.slice(0, 12).join("\t"))
      .join("\n")
      .slice(0, 6000),
  }));

  return {
    activeSheet: active
      ? {
          id: active.id,
          title: active.title,
          revision: active.revision,
          rows: truncateRows(active.rows, 60, 16),
        }
      : undefined,
    workspaceSheets: brief,
  };
};
