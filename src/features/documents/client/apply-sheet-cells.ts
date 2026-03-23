import type { SheetCellsOutput } from "@/features/documents/file-spec";
import {
  MAX_CELL_LENGTH,
  WORKSPACE_SHEET_COLS,
  WORKSPACE_SHEET_ROWS,
} from "@/features/documents/limits";
import type { WorkspaceSheet } from "@/features/documents/sheets-types";

const ensureGrid = (rows: string[][]): string[][] => {
  const out = rows.map((r) => [...r]);
  while (out.length < WORKSPACE_SHEET_ROWS) {
    out.push(Array(WORKSPACE_SHEET_COLS).fill(""));
  }
  return out.slice(0, WORKSPACE_SHEET_ROWS).map((r) => {
    const row = [...r];
    while (row.length < WORKSPACE_SHEET_COLS) row.push("");
    return row.slice(0, WORKSPACE_SHEET_COLS);
  });
};

export const applySheetCellsToSheet = (
  sheet: WorkspaceSheet,
  payload: SheetCellsOutput,
):
  | { ok: true; rows: string[][]; newRevision: number }
  | { ok: false; reason: string } => {
  if (payload.sheetId !== sheet.id) {
    return { ok: false, reason: "Sheet id mismatch." };
  }
  if (payload.sheetRevision !== sheet.revision) {
    return {
      ok: false,
      reason: `Revision mismatch (sheet at ${sheet.revision}, tool used ${payload.sheetRevision}).`,
    };
  }

  const next = ensureGrid(sheet.rows);
  for (const cell of payload.cells) {
    const { r, c } = cell;
    if (
      r < 0 ||
      c < 0 ||
      r >= WORKSPACE_SHEET_ROWS ||
      c >= WORKSPACE_SHEET_COLS
    ) {
      continue;
    }
    const val =
      typeof cell.value === "string"
        ? cell.value.slice(0, MAX_CELL_LENGTH)
        : String(cell.value ?? "").slice(0, MAX_CELL_LENGTH);
    const row = [...next[r]];
    row[c] = val;
    next[r] = row;
  }

  return {
    ok: true,
    rows: next,
    newRevision: sheet.revision + 1,
  };
};
