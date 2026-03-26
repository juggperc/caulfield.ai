import { tool } from "ai";
import { z } from "zod";
import type { DocEditsOutput, SheetCellsOutput } from "./file-spec";
import {
 MAX_CELL_LENGTH,
 MAX_SHEET_CELLS_PER_TOOL_CALL,
 MAX_DOC_EDITS_PER_CALL,
} from "./limits";

export type SheetToolContext = {
 readonly sheetsById: Map<
 string,
 { revision: number; title: string; rowCount: number; colCount: number; rows?: string[][] }
 >;
 readonly defaultSheetId: string | undefined;
};

export type DocToolContext = {
 readonly docRevision: number;
 readonly docPlainText: string;
 readonly docContentJson: unknown;
};

const cellSchema = z.object({
 r: z.number().int().min(0).describe("Row index (0-based)"),
 c: z.number().int().min(0).describe("Column index (0-based)"),
 value: z
  .string()
  .max(MAX_CELL_LENGTH)
  .describe("Cell text (empty string clears visually)"),
});

const docEditSchema = z.object({
 type: z.literal("replace_range"),
 from: z.number().int().describe("ProseMirror position (inclusive) start"),
 to: z.number().int().describe("ProseMirror position (exclusive) end"),
 content: z.unknown().describe("TipTap/ProseMirror JSON fragment"),
});

const insertAtSchema = z.object({
 type: z.literal("insert_at"),
 pos: z.number().int().describe("ProseMirror position to insert at"),
 content: z.unknown().describe("TipTap/ProseMirror JSON to insert"),
});

const deleteRangeSchema = z.object({
 type: z.literal("delete_range"),
 from: z.number().int().describe("ProseMirror position (inclusive) start"),
 to: z.number().int().describe("ProseMirror position (exclusive) end"),
});

const coerceTipTapContent = (content: unknown): unknown => {
 if (typeof content === "string") {
 const t = content.trim();
 if (t.startsWith("{") || t.startsWith("[")) {
 try {
 return coerceTipTapContent(JSON.parse(t));
 } catch {
 /* fall through */
 }
 }
 return {
 type: "paragraph",
 content: [{ type: "text", text: content }],
 };
 }

 const isRecord = (x: unknown): x is Record<string, unknown> =>
 typeof x === "object" && x !== null && !Array.isArray(x);

 if (isRecord(content) && content.type === "doc" && Array.isArray(content.content)) {
 const nodes = content.content as unknown[];
 if (nodes.length === 1) return nodes[0];
 return nodes;
 }

 return content;
};

export const createSheetsToolset = (ctx: SheetToolContext) => {
 const tools = {
 sheets_apply_cells: tool({
 description: `Apply cell updates to a workspace sheet.

**Example:** Set cells A1-B2 with headers and data:
\`\`\`json
{
 "sheetRevision": 0,
 "cells": [
  {"r": 0, "c": 0, "value": "Name"},
  {"r": 0, "c": 1, "value": "Score"},
  {"r": 1, "c": 0, "value": "Alice"},
  {"r": 1, "c": 1, "value": "95"}
 ]
}
\`\`\`

Keep tool calls small. For large datasets, prefer multiple calls with 20-50 cells each.`,
 inputSchema: z.object({
 sheetId: z.string().optional().describe("Target sheet id; omit for active sheet"),
 sheetRevision: z.number().int().describe("Must match current sheet revision"),
 cells: z.array(cellSchema).min(1).max(MAX_SHEET_CELLS_PER_TOOL_CALL),
 }),
 execute: async ({
 sheetId: sheetIdArg,
 sheetRevision,
 cells,
 }): Promise<SheetCellsOutput> => {
 const sid =
 sheetIdArg?.trim() ||
 ctx.defaultSheetId ||
 [...ctx.sheetsById.keys()][0] ||
 "";
 if (!sid || !ctx.sheetsById.has(sid)) {
 throw new Error("Unknown sheet id. Use sheet ids from context.");
 }
 return {
 kind: "sheet_cells",
 sheetId: sid,
 sheetRevision,
 cells,
 };
 },
 }),

 sheets_describe_range: tool({
 description: `Get metadata about a range of cells in a sheet. Returns column headers (if present), data types detected, and basic statistics.

Use this BEFORE making bulk changes to understand what's in the target area.

**Example:**
\`\`\`json
{"startRow": 0, "startCol": 0, "endRow": 10, "endCol": 3}
\`\`\`

Returns: headers if first row looks like headers, detected types (numeric/text/mixed), counts of empty/non-empty cells.`,
 inputSchema: z.object({
 sheetId: z.string().optional().describe("Target sheet id; omit for active sheet"),
 startRow: z.number().int().min(0).describe("Start row (0-based)"),
 startCol: z.number().int().min(0).describe("Start column (0-based)"),
 endRow: z.number().int().min(0).describe("End row (inclusive)"),
 endCol: z.number().int().min(0).describe("End column (inclusive)"),
 }),
 execute: async ({ sheetId: sheetIdArg, startRow, startCol, endRow, endCol }) => {
 const sid =
 sheetIdArg?.trim() ||
 ctx.defaultSheetId ||
 [...ctx.sheetsById.keys()][0] ||
 "";
 if (!sid || !ctx.sheetsById.has(sid)) {
 throw new Error("Unknown sheet id. Use sheet ids from context.");
 }

 const sheet = ctx.sheetsById.get(sid);
 if (!sheet) {
 throw new Error("Sheet not found.");
 }

 const rows = sheet.rows;
 if (!rows) {
 return {
 kind: "range_description",
 sheetId: sid,
 startRow,
 startCol,
 endRow,
 endCol,
 headers: [],
 types: [],
 stats: { totalCells: 0, emptyCells: 0, numericCells: 0, textCells: 0 },
 };
 }

 const headers: string[] = [];
 const types: string[] = [];
 let totalCells = 0;
 let emptyCells = 0;
 let numericCells = 0;
 let textCells = 0;

 for (let c = startCol; c <= endCol && c < (rows[0]?.length ?? 0); c++) {
 const headerVal = rows[0]?.[c] ?? "";
 headers.push(typeof headerVal === "string" ? headerVal : String(headerVal));
 }

 for (let r = startRow; r <= endRow && r < rows.length; r++) {
 for (let c = startCol; c <= endCol && c < (rows[r]?.length ?? 0); c++) {
 totalCells++;
 const val = rows[r]?.[c];
 if (!val || (typeof val === "string" && val.trim() === "")) {
 emptyCells++;
 continue;
 }
 const num = Number(val);
 if (!Number.isNaN(num) && Number.isFinite(num)) {
 numericCells++;
 } else {
 textCells++;
 }
 }
 }

 for (let c = startCol; c <= endCol; c++) {
 let hasNumeric = false;
 let hasText = false;
 for (let r = startRow; r <= endRow && r < rows.length; r++) {
 const val = rows[r]?.[c];
 if (!val || (typeof val === "string" && val.trim() === "")) continue;
 const num = Number(val);
 if (!Number.isNaN(num) && Number.isFinite(num)) hasNumeric = true;
 else hasText = true;
 }
 types.push(hasNumeric && !hasText ? "numeric" : hasText && !hasNumeric ? "text" : "mixed");
 }

 return {
 kind: "range_description",
 sheetId: sid,
 startRow,
 startCol,
 endRow,
 endCol,
 headers,
 types,
 stats: { totalCells, emptyCells, numericCells, textCells },
 };
 },
 }),

 sheets_get_dimensions: tool({
 description: `Get the actual used dimensions of a sheet (not the full grid). Returns the row/column indices that contain data.

**Use case:** Before setting a range, know where data exists to avoid overwriting or to find the next empty row.`,
 inputSchema: z.object({
 sheetId: z.string().optional().describe("Target sheet id; omit for active sheet"),
 }),
 execute: async ({ sheetId: sheetIdArg }) => {
 const sid =
 sheetIdArg?.trim() ||
 ctx.defaultSheetId ||
 [...ctx.sheetsById.keys()][0] ||
 "";
 if (!sid || !ctx.sheetsById.has(sid)) {
 throw new Error("Unknown sheet id. Use sheet ids from context.");
 }

 const sheet = ctx.sheetsById.get(sid);
 if (!sheet) {
 throw new Error("Sheet not found.");
 }

 const rows = sheet.rows;
 if (!rows || rows.length === 0) {
 return { kind: "dimensions", sheetId: sid, maxRow: -1, maxCol: -1, rowCount: 0, colCount: 0 };
 }

 let maxRow = -1;
 let maxCol = -1;

 for (let r = 0; r < rows.length; r++) {
 for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
 const val = rows[r][c];
 if (val && String(val).trim() !== "") {
 maxRow = Math.max(maxRow, r);
 maxCol = Math.max(maxCol, c);
 }
 }
 }

 return {
 kind: "dimensions",
 sheetId: sid,
 maxRow,
 maxCol,
 rowCount: maxRow + 1,
 colCount: maxCol + 1,
 };
 },
 }),

 sheets_get_headers: tool({
 description: `Get the first row values as potential column headers. Useful for understanding column semantics before operations.`,
 inputSchema: z.object({
 sheetId: z.string().optional().describe("Target sheet id; omit for active sheet"),
 }),
 execute: async ({ sheetId: sheetIdArg }) => {
 const sid =
 sheetIdArg?.trim() ||
 ctx.defaultSheetId ||
 [...ctx.sheetsById.keys()][0] ||
 "";
 if (!sid || !ctx.sheetsById.has(sid)) {
 throw new Error("Unknown sheet id. Use sheet ids from context.");
 }

 const sheet = ctx.sheetsById.get(sid);
 if (!sheet) {
 throw new Error("Sheet not found.");
 }

 const rows = sheet.rows;
 const headers = rows?.[0]?.map((c) => (typeof c === "string" ? c : String(c))) ?? [];

 return { kind: "headers", sheetId: sid, headers };
 },
 }),

 sheets_set_range: tool({
 description: `Set a rectangular range of cells with a 2D array of values. Higher-level than sheets_apply_cells.

**Example:** Set A1:B3 with headers and two data rows:
\`\`\`json
{
 "sheetRevision": 0,
 "startRow": 0,
 "startCol": 0,
 "values": [
  ["Name", "Score"],
  ["Alice", "95"],
  ["Bob", "87"]
 ]
}
\`\`\`

Automatically expands cell list. Prefer this for structured data.`,
 inputSchema: z.object({
 sheetId: z.string().optional().describe("Target sheet id; omit for active sheet"),
 sheetRevision: z.number().int().describe("Must match current sheet revision"),
 startRow: z.number().int().min(0).describe("Start row (0-based, typically 0 for headers)"),
 startCol: z.number().int().min(0).describe("Start column (0-based, typically 0 for first column)"),
 values: z
  .array(z.array(z.union([z.string(), z.number()])))
  .min(1)
  .max(100)
  .describe("2D array of values; inner arrays are rows"),
 }),
 execute: async ({
 sheetId: sheetIdArg,
 sheetRevision,
 startRow,
 startCol,
 values,
 }): Promise<SheetCellsOutput> => {
 const sid =
 sheetIdArg?.trim() ||
 ctx.defaultSheetId ||
 [...ctx.sheetsById.keys()][0] ||
 "";
 if (!sid || !ctx.sheetsById.has(sid)) {
 throw new Error("Unknown sheet id. Use sheet ids from context.");
 }

 const cells: { r: number; c: number; value: string }[] = [];
 for (let r = 0; r < values.length; r++) {
 const row = values[r];
 if (!Array.isArray(row)) continue;
 for (let c = 0; c < row.length; c++) {
 const val = row[c];
 cells.push({
 r: startRow + r,
 c: startCol + c,
 value: typeof val === "string" ? val.slice(0, MAX_CELL_LENGTH) : String(val).slice(0, MAX_CELL_LENGTH),
 });
 }
 }

 return {
 kind: "sheet_cells",
 sheetId: sid,
 sheetRevision,
 cells,
 };
 },
 }),

 sheets_suggest_formula: tool({
 description: `Suggest a spreadsheet formula based on natural language intent.

**Examples:**
- "sum column B where column A equals Sales" → suggests SUMIF
- "average of cells in range A1:A10" → suggests AVERAGE
- "count non-empty cells in column C" → suggests COUNTA

Returns the suggested formula syntax and explanation.`,
 inputSchema: z.object({
 intent: z.string().describe("Natural language description of what you want to calculate"),
 range: z.string().optional().describe("Optional range hint like 'A1:A10' or 'B:B'"),
 }),
 execute: async ({ intent, range }) => {
 const lowerIntent = intent.toLowerCase();

 if (lowerIntent.includes("sum") && (lowerIntent.includes("where") || lowerIntent.includes("if"))) {
 const rangeHint = range ?? "A:A";
 return {
 kind: "formula_suggestion",
 suggestion: `=SUMIF(${rangeHint}, criteria, sum_range)`,
 explanation: "SUMIF sums values in a range that meet criteria. Use: =SUMIF(A:A, \"Sales\", B:B)",
 };
 }

 if (lowerIntent.includes("sum")) {
 const rangeHint = range ?? "A1:A10";
 return {
 kind: "formula_suggestion",
 suggestion: `=SUM(${rangeHint})`,
 explanation: "SUM adds all numbers in the specified range.",
 };
 }

 if (lowerIntent.includes("average") || lowerIntent.includes("avg") || lowerIntent.includes("mean")) {
 const rangeHint = range ?? "A1:A10";
 return {
 kind: "formula_suggestion",
 suggestion: `=AVERAGE(${rangeHint})`,
 explanation: "AVERAGE calculates the arithmetic mean of numbers in the range.",
 };
 }

 if (lowerIntent.includes("count") && (lowerIntent.includes("non-empty") || lowerIntent.includes("non empty") || lowerIntent.includes("text"))) {
 const rangeHint = range ?? "A1:A10";
 return {
 kind: "formula_suggestion",
 suggestion: `=COUNTA(${rangeHint})`,
 explanation: "COUNTA counts non-empty cells (text or numbers).",
 };
 }

 if (lowerIntent.includes("count")) {
 const rangeHint = range ?? "A1:A10";
 return {
 kind: "formula_suggestion",
 suggestion: `=COUNT(${rangeHint})`,
 explanation: "COUNT counts only numeric values in the range. Use COUNTA for all non-empty cells.",
 };
 }

 if (lowerIntent.includes("max") || lowerIntent.includes("maximum") || lowerIntent.includes("largest")) {
 const rangeHint = range ?? "A1:A10";
 return {
 kind: "formula_suggestion",
 suggestion: `=MAX(${rangeHint})`,
 explanation: "MAX returns the largest value in the range.",
 };
 }

 if (lowerIntent.includes("min") || lowerIntent.includes("minimum") || lowerIntent.includes("smallest")) {
 const rangeHint = range ?? "A1:A10";
 return {
 kind: "formula_suggestion",
 suggestion: `=MIN(${rangeHint})`,
 explanation: "MIN returns the smallest value in the range.",
 };
 }

 if (lowerIntent.includes("if")) {
 const rangeHint = range ?? "A1";
 return {
 kind: "formula_suggestion",
 suggestion: `=IF(${rangeHint}>0, "Positive", "Zero or negative")`,
 explanation: "IF tests a condition and returns one value if true, another if false. Nest for multiple conditions.",
 };
 }

 return {
 kind: "formula_suggestion",
 suggestion: `=SUM(A1:A10)`,
 explanation: "Could not determine intent from description. SUM is a safe default. Please be more specific about what you want to calculate.",
 };
 },
 }),
 };

return { tools };
};

export const createDocsEditorToolset = () => {
 const tools = {
 docs_apply_edits: tool({
 description: `Apply structured edits to the open document.

**Edit types:**
- \`replace_range\`: Delete from-to and insert content at from.
- \`insert_at\`: Insert content at pos without deletion.
- \`delete_range\`: Delete from-to only.

**Important:** revision MUST match current revision or client rejects.

**Example:** Insert a new paragraph at the start:
\`\`\`json
{
 "docRevision": 0,
 "edits": [{
  "type": "insert_at",
  "pos": 0,
  "content": { "type": "paragraph", "content": [{ "type": "text", "text": "Hello world." }] }
 }]
}
\`\`\`

**Example:** Replace text from position 5 to 10:
\`\`\`json
{
 "docRevision": 0,
 "edits": [{
  "type": "replace_range",
  "from": 5,
  "to": 10,
  "content": { "type": "paragraph", "content": [{ "type": "text", "text": "new text" }] }
 }]
}
\`\`\`

Prefer multiple small edits over one huge edit. Paragraph nodes with text children are most reliable.`,
 inputSchema: z.object({
 docRevision: z.number().int().describe("Must match current document revision"),
 edits: z.array(z.union([docEditSchema, insertAtSchema, deleteRangeSchema])).min(1).max(MAX_DOC_EDITS_PER_CALL),
 }),
 execute: async (input): Promise<DocEditsOutput> => ({
 kind: "doc_edits",
 docRevision: input.docRevision,
 edits: input.edits.map((e) => {
 if (e.type === "delete_range") return e;
 return { ...e, content: coerceTipTapContent((e as { content: unknown }).content) };
 }),
 }),
 }),

 docs_insert_after: tool({
 description: `Insert content after finding a target text pattern. Higher-level than docs_apply_edits.

**Use case:** "Insert a new paragraph after the heading 'Introduction'" without needing ProseMirror positions.

**Example:**
\`\`\`json
{
 "afterText": "Introduction",
 "content": { "type": "paragraph", "content": [{ "type": "text", "text": "This is the first section." }] }
}
\`\`\`

Returns the actual position used for insertion or an error if text not found.`,
 inputSchema: z.object({
 docRevision: z.number().int().describe("Must match current document revision"),
 afterText: z.string().describe("Text to find; content is inserted immediately after this text"),
 content: z.unknown().describe("TipTap/ProseMirror JSON to insert (paragraph node recommended)"),
 }),
 execute: async (input) => ({
 kind: "doc_insert_after",
 docRevision: input.docRevision,
 afterText: input.afterText,
 content: coerceTipTapContent(input.content),
 }),
 }),

 docs_replace_text: tool({
 description: `Replace all occurrences of a text pattern with new content. Safer than position-based edits.

**Example:**
\`\`\`json
{
 "findText": "foo",
 "replaceWith": "bar"
}
\`\`\`

Replaces all "foo" with "bar" in the document. Returns count of replacements.`,
 inputSchema: z.object({
 docRevision: z.number().int().describe("Must match current document revision"),
 findText: z.string().min(1).describe("Text to find (exact match)"),
 replaceWith: z.string().describe("Replacement text"),
 }),
 execute: async (input) => ({
 kind: "doc_replace_text",
 docRevision: input.docRevision,
 findText: input.findText,
 replaceWith: input.replaceWith,
 }),
 }),

 docs_get_current_revision: tool({
 description: `Get the current document revision number. Use this when you get a revision mismatch error to re-sync.

Call this, then retry your edits with the new revision number.`,
 inputSchema: z.object({}),
 execute: async () => ({
 kind: "doc_current_revision",
 revision: 0,
 note: "The actual revision is provided by the client context. Use this tool to re-sync after revision errors.",
 }),
 }),
 };

 return { tools };
};