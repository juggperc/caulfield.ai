export type WorkspaceSheetCell = {
  raw: string;
  display: string;
};

export type SheetCell = WorkspaceSheetCell;
export type SheetCellData = WorkspaceSheetCell;

export const emptySheetCell = (): WorkspaceSheetCell => ({
  raw: "",
  display: "",
});

export const createCellInput = (raw: string): WorkspaceSheetCell => ({
  raw,
  display: raw,
});

export type WorkspaceSheet = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  revision: number;
  /** Row-major; ragged rows padded on read/write. */
  rows: WorkspaceSheetCell[][];
};
