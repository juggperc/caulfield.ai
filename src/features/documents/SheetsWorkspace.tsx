"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  importCsvFileAsSheet,
  serializeSheetToCsv,
} from "@/features/documents/docs-import-export";
import {
  WORKSPACE_SHEET_COLS,
  WORKSPACE_SHEET_ROWS,
} from "@/features/documents/limits";
import { motion } from "framer-motion";
import {
  Download,
  FileUp,
  Plus,
  Rows3,
  Trash2,
  Columns3,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useSheets } from "./sheets-context";
import { FormulaGuide } from "./FormulaGuide";

const colLabel = (c: number): string => {
  let s = "";
  let n = c + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const formatListDate = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const SheetsWorkspace = () => {
  const {
    sheets,
    selectedId,
    setSelectedId,
    selectedSheet,
    createSheet,
    deleteSheet,
    updateSheetTitle,
    updateCellInput,
    importSheet,
    addSheetRow,
    addSheetColumn,
  } = useSheets();

  const sorted = [...sheets].sort((a, b) => b.updatedAt - a.updatedAt);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(
    null,
  );

  const handleExportCsv = () => {
    if (!selectedSheet) return;
    const blob = new Blob([serializeSheetToCsv(selectedSheet)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(selectedSheet.title || "sheet").replace(/[^\w.-]+/g, "_")}.csv`;
    a.rel = "noopener";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imported = await importCsvFileAsSheet(file);
    importSheet(imported);
    event.target.value = "";
  };

  const activeCellValue = useMemo(() => {
    if (!selectedSheet || !activeCell) return "";
    return selectedSheet.rows[activeCell.r]?.[activeCell.c]?.raw ?? "";
  }, [selectedSheet, activeCell]);

  const visibleCols = Math.min(WORKSPACE_SHEET_COLS, 16);
  const visibleRows = Math.min(WORKSPACE_SHEET_ROWS, 40);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-muted">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 max-h-[min(38vh,260px)] w-full shrink-0 flex-col border-border bg-muted max-md:border-b md:max-h-none md:w-[min(100%,260px)] md:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <span className="text-[13px] font-semibold tracking-tight text-foreground">
              Spreadsheets
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:bg-accent"
              onClick={createSheet}
              aria-label="New sheet"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="px-2 py-1.5" role="listbox" aria-label="Sheets list">
              {sorted.length === 0 ? (
                <li className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                  No sheets yet
                </li>
              ) : (
                sorted.map((sh) => {
                  const active = sh.id === selectedId;
                  return (
                    <motion.li
                      key={sh.id}
                      layout
                      initial={false}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => setSelectedId(sh.id)}
                        className={
                          active
                            ? "mb-0.5 w-full rounded-lg bg-card px-2.5 py-2 text-left shadow-sm ring-1 ring-border"
                            : "mb-0.5 w-full rounded-lg px-2.5 py-2 text-left hover:bg-accent/50"
                        }
                      >
                        <div className="truncate text-[13px] font-medium leading-snug text-foreground">
                          {sh.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          rev {sh.revision} · {formatListDate(sh.updatedAt)}
                        </div>
                      </button>
                    </motion.li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </div>

        <div className="flex min-h-[min(42vh,360px)] min-w-0 flex-1 flex-col bg-card max-md:border-b md:min-h-0">
          {selectedSheet ? (
            <>
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
                <Input
                  value={selectedSheet.title}
                  onChange={(e) =>
                    updateSheetTitle(selectedSheet.id, e.target.value)
                  }
                  className="h-auto max-w-md border-0 bg-transparent px-0 text-lg font-semibold tracking-tight text-foreground shadow-none focus-visible:ring-0"
                  aria-label="Sheet title"
                />
                <div className="flex shrink-0 gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleImportCsv}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Import CSV into sheet"
                  >
                    <FileUp className="size-3.5 opacity-70" aria-hidden />
                    Import CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={handleExportCsv}
                    aria-label="Export sheet as CSV"
                  >
                    <Download className="size-3.5 opacity-70" aria-hidden />
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => addSheetRow(selectedSheet.id)}
                    aria-label="Add row"
                  >
                    <Rows3 className="size-3.5 opacity-70" aria-hidden />
                    Row
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => addSheetColumn(selectedSheet.id)}
                    aria-label="Add column"
                  >
                    <Columns3 className="size-3.5 opacity-70" aria-hidden />
                    Column
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => deleteSheet(selectedSheet.id)}
                    aria-label="Delete sheet"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Formula
                </span>
                <FormulaGuide />
                <Input
                  value={activeCellValue}
                  onChange={(e) => {
                    if (!selectedSheet || !activeCell) return;
                    updateCellInput(
                      selectedSheet.id,
                      activeCell.r,
                      activeCell.c,
                      e.target.value,
                    );
                  }}
                  placeholder="Select a cell to edit its formula or value"
                  className="h-9 bg-background"
                  aria-label="Formula bar"
                />
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-3">
                  <table
                    className="w-max border-collapse border border-border text-sm"
                    aria-label="Sheet grid"
                  >
                    <thead>
                      <tr>
                        <th className="h-8 w-10 border border-border bg-muted text-[10px] font-medium text-muted-foreground" />
                        {Array.from({ length: visibleCols }, (_, c) => (
                          <th
                            key={colLabel(c)}
                            className="h-8 min-w-[7rem] border border-border bg-muted px-1 text-center text-[10px] font-medium text-muted-foreground"
                          >
                            {colLabel(c)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: visibleRows }, (_, r) => (
                        <tr key={r}>
                          <td className="border border-border bg-muted/50 px-1 text-center text-[10px] text-muted-foreground">
                            {r + 1}
                          </td>
                          {Array.from({ length: visibleCols }, (_, c) => {
                            const cell = selectedSheet.rows[r]?.[c];
                            const displayValue = cell?.display ?? "";
                            const isActive =
                              activeCell?.r === r && activeCell?.c === c;
                            return (
                              <td
                                key={c}
                                className="border border-border p-0 align-top"
                              >
                                <input
                                  type="text"
                                  value={isActive ? cell?.raw ?? "" : displayValue}
                                  onFocus={() => setActiveCell({ r, c })}
                                  onChange={(e) =>
                                    updateCellInput(
                                      selectedSheet.id,
                                      r,
                                      c,
                                      e.target.value,
                                    )
                                  }
                                  className="box-border h-8 w-full min-w-[6.5rem] border-0 bg-transparent px-2 py-1 text-[13px] text-foreground outline-none focus:bg-accent/50 focus:ring-2 focus:ring-inset focus:ring-ring/60"
                                  aria-label={`Cell ${colLabel(c)}${r + 1}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Showing first {visibleRows}×{visibleCols} cells (
                    {WORKSPACE_SHEET_ROWS}×{WORKSPACE_SHEET_COLS} stored). Doc
                    assistant can update cells via{" "}
                    <code className="rounded bg-muted px-1 font-mono text-[10px]">
                      sheets_apply_cells
                    </code>
                    . Formulas support cell refs, ranges, and basics like
                    {" "}
                    <code className="rounded bg-muted px-1 font-mono text-[10px]">
                      =SUM(A1:B3)
                    </code>
                    .
                  </p>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
              <p className="text-sm text-muted-foreground">
                Create a sheet to start.
              </p>
              <Button type="button" variant="outline" onClick={createSheet}>
                New sheet
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
