"use client";

import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { WorkspaceSheet, WorkspaceSheetCell } from "../sheets-types";

export type RangeDescriptionOutput = {
 kind: "range_description";
 sheetId: string;
 startRow: number;
 startCol: number;
 endRow: number;
 endCol: number;
 headers: string[];
 types: string[];
 stats: { totalCells: number; emptyCells: number; numericCells: number; textCells: number };
};

export type DimensionsOutput = {
 kind: "dimensions";
 sheetId: string;
 maxRow: number;
 maxCol: number;
 rowCount: number;
 colCount: number;
};

export type HeadersOutput = {
 kind: "headers";
 sheetId: string;
 headers: string[];
};

export type FormulaSuggestionOutput = {
 kind: "formula_suggestion";
 suggestion: string;
 explanation: string;
};

export type DocInsertAfterOutput = {
 kind: "doc_insert_after";
 docRevision: number;
 afterText: string;
 content: unknown;
};

export type DocReplaceTextOutput = {
 kind: "doc_replace_text";
 docRevision: number;
 findText: string;
 replaceWith: string;
};

export type DocCurrentRevisionOutput = {
 kind: "doc_current_revision";
 revision: number;
 note?: string;
};

export const applyDocInsertAfterToEditor = (
 editor: Editor,
 payload: DocInsertAfterOutput,
 currentRevision: number,
 plainText: string,
): { ok: true; newRevision: number } | { ok: false; reason: string } => {
 if (payload.docRevision !== currentRevision) {
 return {
 ok: false,
 reason: `Revision mismatch (document is at ${currentRevision}, tool used ${payload.docRevision}).`,
 };
 }

 const index = plainText.indexOf(payload.afterText);
 if (index === -1) {
 return { ok: false, reason: `Could not find text "${payload.afterText}" in document.` };
 }

 const posAfter = index + payload.afterText.length;
 const docSize = editor.state.doc.content.size;
 if (posAfter < 0 || posAfter > docSize) {
 return { ok: false, reason: `Invalid position after text match.` };
 }

 editor.chain().focus().insertContentAt(posAfter, payload.content as JSONContent).run();

 return { ok: true, newRevision: currentRevision + 1 };
};

export const applyDocReplaceTextToEditor = (
 editor: Editor,
 payload: DocReplaceTextOutput,
 currentRevision: number,
 plainText: string,
): { ok: true; newRevision: number; replaceCount: number } | { ok: false; reason: string } => {
 if (payload.docRevision !== currentRevision) {
 return {
 ok: false,
 reason: `Revision mismatch (document is at ${currentRevision}, tool used ${payload.docRevision}).`,
 };
 }

 const findText = payload.findText;
 const replaceWith = payload.replaceWith;
 
 if (!findText) {
 return { ok: false, reason: "findText cannot be empty." };
 }

 let count = 0;
 let searchPos = 0;
 const { doc } = editor.state;
 const docText = doc.textContent;

 while (searchPos < docText.length) {
 const foundIndex = docText.indexOf(findText, searchPos);
 if (foundIndex === -1) break;

 let from = foundIndex;
 let to = foundIndex + findText.length;

 let nodePos = 0;
 doc.descendants((node, pos) => {
 if (node.isText && node.text) {
 const nodeEndPos = pos + node.nodeSize;
 if (from >= pos && from < nodeEndPos) {
 const localFrom = from - pos;
 const localTo = Math.min(to - pos, node.text.length);
 const beforeText = node.text.slice(0, localFrom);
 const afterText = node.text.slice(localTo);
 const newText = beforeText + replaceWith + afterText;
 editor.chain().focus().setTextSelection({ from: pos + localFrom, to: pos + localTo }).deleteSelection().insertContent(replaceWith).run();
 }
 }
 });

 count++;
 searchPos = foundIndex + replaceWith.length;
 }

 if (count === 0) {
 return { ok: true, newRevision: currentRevision, replaceCount: 0 };
 }

 return { ok: true, newRevision: currentRevision + 1, replaceCount: count };
};

export const applySetRangeToSheet = (
 sheet: WorkspaceSheet,
 startRow: number,
 startCol: number,
 values: (string | number)[][],
): { ok: true; rows: WorkspaceSheet["rows"]; newRevision: number } => {
 const MAX_ROWS = 100;
 const MAX_COLS = 26;
 const MAX_CELL_LENGTH = 2000;

 const newRows: WorkspaceSheetCell[][] = sheet.rows.map((row: WorkspaceSheetCell[]) => row.map((cell: WorkspaceSheetCell) => ({ ...cell })));

 for (let r = 0; r < values.length; r++) {
 const targetRow = startRow + r;
 if (targetRow < 0 || targetRow >= MAX_ROWS) continue;

 while (newRows.length <= targetRow) {
 newRows.push(Array.from({ length: MAX_COLS }, () => ({ raw: "", display: "" })));
 }

 const rowData = values[r];
 if (!Array.isArray(rowData)) continue;

 for (let c = 0; c < rowData.length; c++) {
 const targetCol = startCol + c;
 if (targetCol < 0 || targetCol >= MAX_COLS) continue;

 const val = rowData[c];
 const cellValue = typeof val === "string" ? val : String(val ?? "");
 newRows[targetRow]![targetCol] = {
 raw: cellValue.slice(0, MAX_CELL_LENGTH),
 display: cellValue.slice(0, MAX_CELL_LENGTH),
 };
 }
 }

 return { ok: true, rows: newRows, newRevision: sheet.revision + 1 };
};