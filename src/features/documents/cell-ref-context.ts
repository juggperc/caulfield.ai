type CellRef = { ref: string; row: number; col: number } | null;

let pendingCellRef: CellRef = null;
let formulaBuilderOpen = false;

export const setPendingCellRef = (ref: CellRef) => {
  pendingCellRef = ref;
};

export const getPendingCellRef = (): CellRef => {
  return pendingCellRef;
};

export const clearPendingCellRef = () => {
  pendingCellRef = null;
};

export const isFormulaBuilderOpen = () => formulaBuilderOpen;
export const setFormulaBuilderOpen = (open: boolean) => {
  formulaBuilderOpen = open;
  if (!open) clearPendingCellRef();
};

export const colLabel = (c: number): string => {
  let s = "";
  let n = c + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

export const getCellRef = (row: number, col: number): string => {
  return `${colLabel(col)}${row + 1}`;
};
