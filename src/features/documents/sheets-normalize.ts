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
import {
  createCellInput,
  emptySheetCell,
  type WorkspaceSheet,
  type WorkspaceSheetCell,
} from "./sheets-types";
import { evaluateSheetRows } from "./sheet-formulas";

const clampCell = (s: string) =>
  typeof s === "string" ? s.slice(0, MAX_CELL_LENGTH) : "";

const normalizeCell = (raw: unknown): WorkspaceSheetCell => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptySheetCell();
  }

  const candidate = raw as { input?: unknown; display?: unknown };
  const input =
    typeof candidate.input === "string"
      ? candidate.input
      : typeof candidate.display === "string"
        ? candidate.display
        : "";

  return createCellInput(clampCell(input));
};

const padRow = (row: unknown[], cols: number): WorkspaceSheetCell[] => {
  const out: WorkspaceSheetCell[] = [];
  for (let c = 0; c < cols; c++) {
    out.push(normalizeCell(row[c]));
  }
  return out;
};

const emptyGrid = (rows: number, cols: number): WorkspaceSheetCell[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => emptySheetCell()),
  );

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

  let rows: WorkspaceSheetCell[][] = emptyGrid(
    DEFAULT_SHEET_ROWS,
    DEFAULT_SHEET_COLS,
  );
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
    rows: evaluateSheetRows(rows),
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
