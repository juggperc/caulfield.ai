import {
  MAX_CELL_LENGTH,
  WORKSPACE_MAX_SHEETS,
  WORKSPACE_SHEET_COLS,
  WORKSPACE_SHEET_ROWS,
} from "./limits";
import {
  DEFAULT_SHEET_COLS,
  DEFAULT_SHEET_ROWS,
} from "./sheets-constants";
import type { WorkspaceSheet } from "./sheets-types";

const clampCell = (s: string) =>
  typeof s === "string" ? s.slice(0, MAX_CELL_LENGTH) : "";

const padRow = (row: unknown[], cols: number): string[] => {
  const out: string[] = [];
  for (let c = 0; c < cols; c++) {
    const v = row[c];
    out.push(clampCell(typeof v === "string" ? v : String(v ?? "")));
  }
  return out;
};

const emptyGrid = (rows: number, cols: number): string[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));

export const normalizeWorkspaceSheet = (raw: unknown): WorkspaceSheet | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const title =
    typeof o.title === "string" && o.title.trim()
      ? o.title.trim()
      : "Untitled sheet";
  const createdAt =
    typeof o.createdAt === "number" ? o.createdAt : Date.now();
  const updatedAt =
    typeof o.updatedAt === "number" ? o.updatedAt : Date.now();
  const revision =
    typeof o.revision === "number" && Number.isInteger(o.revision)
      ? o.revision
      : 0;

  let rows: string[][] = emptyGrid(DEFAULT_SHEET_ROWS, DEFAULT_SHEET_COLS);
  if (Array.isArray(o.rows)) {
    const src = o.rows.slice(0, WORKSPACE_SHEET_ROWS) as unknown[];
    rows = src.map((row) => {
      if (!Array.isArray(row)) return padRow([], WORKSPACE_SHEET_COLS);
      return padRow(row, WORKSPACE_SHEET_COLS);
    });
    while (rows.length < DEFAULT_SHEET_ROWS) {
      rows.push(padRow([], WORKSPACE_SHEET_COLS));
    }
  }

  return {
    id: o.id,
    title,
    createdAt,
    updatedAt,
    revision,
    rows,
  };
};

export const normalizeWorkspaceSheetList = (raw: unknown): WorkspaceSheet[] => {
  if (!Array.isArray(raw)) return [];
  const out: WorkspaceSheet[] = [];
  for (const item of raw) {
    const s = normalizeWorkspaceSheet(item);
    if (s) out.push(s);
  }
  return out.slice(0, WORKSPACE_MAX_SHEETS);
};
