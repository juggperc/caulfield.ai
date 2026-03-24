import { z } from "zod";
import {
  MAX_BULLET_ITEM_LENGTH,
  MAX_BULLET_ITEMS,
  MAX_CELL_LENGTH,
  MAX_HEADING_TEXT,
  MAX_RUNS_PER_PARAGRAPH,
  MAX_RUN_TEXT,
  MAX_SHEET_COLS,
  MAX_SHEET_ROWS,
  MAX_SHEETS,
  MAX_TEXT_DOC_CHARS,
  MAX_WORD_BLOCKS,
} from "./limits";

const cellValueSchema = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).slice(0, MAX_CELL_LENGTH));

const sheetSchema = z.object({
  name: z.string().max(120).describe("Worksheet tab name"),
  rows: z
    .array(z.array(cellValueSchema).max(MAX_SHEET_COLS))
    .max(MAX_SHEET_ROWS)
    .describe("Row-major cell values; ragged rows are padded when building"),
});

export const spreadsheetInputSchema = z.object({
  filename: z
    .string()
    .max(180)
    .describe("Base filename without path; .xlsx added if missing"),
  sheets: z
    .array(sheetSchema)
    .min(1)
    .max(MAX_SHEETS)
    .describe("One or more sheets with 2D string data"),
});

const textRunSchema = z.object({
  text: z.string().max(MAX_RUN_TEXT),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
});

const wordBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: z.string().max(MAX_HEADING_TEXT),
  }),
  z.object({
    type: z.literal("paragraph"),
    runs: z.array(textRunSchema).min(1).max(MAX_RUNS_PER_PARAGRAPH),
  }),
  z.object({
    type: z.literal("bulletList"),
    items: z
      .array(z.string().max(MAX_BULLET_ITEM_LENGTH))
      .min(1)
      .max(MAX_BULLET_ITEMS),
  }),
]);

export const wordDocumentInputSchema = z.object({
  filename: z.string().max(180).describe("Base filename; .docx added if missing"),
  blocks: z.array(wordBlockSchema).min(1).max(MAX_WORD_BLOCKS),
});

export const textDocumentInputSchema = z.object({
  filename: z.string().max(180),
  format: z.enum(["csv", "md", "txt"]),
  content: z.string().max(MAX_TEXT_DOC_CHARS),
});

export type SpreadsheetInput = z.infer<typeof spreadsheetInputSchema>;
export type WordDocumentInput = z.infer<typeof wordDocumentInputSchema>;
export type TextDocumentInput = z.infer<typeof textDocumentInputSchema>;

export type FileSpecPayload =
  | {
      kind: "file_spec";
      format: "xlsx";
      filename: string;
      spec: SpreadsheetInput;
      summary?: string;
    }
  | {
      kind: "file_spec";
      format: "docx";
      filename: string;
      spec: WordDocumentInput;
      summary?: string;
    }
  | {
      kind: "file_spec";
      format: "csv" | "md" | "txt";
      filename: string;
      spec: Pick<TextDocumentInput, "content">;
      summary?: string;
    };

export const isFileSpecOutput = (value: unknown): value is FileSpecPayload => {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    o.kind === "file_spec" &&
    typeof o.filename === "string" &&
    typeof o.format === "string"
  );
};

export type DocEdit =
  | {
      type: "replace_range";
      from: number;
      to: number;
      content: unknown;
    }
  | {
      type: "insert_at";
      pos: number;
      content: unknown;
    }
  | {
      type: "delete_range";
      from: number;
      to: number;
    };

export type DocEditsOutput = {
  kind: "doc_edits";
  docRevision: number;
  edits: DocEdit[];
};

export const isDocEditsOutput = (value: unknown): value is DocEditsOutput => {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (o.kind !== "doc_edits" || typeof o.docRevision !== "number")
    return false;
  return Array.isArray(o.edits);
};

export type SheetCellUpdate = {
  r: number;
  c: number;
  value?: string;
  formula?: string;
};

export type SheetCellsOutput = {
  kind: "sheet_cells";
  sheetId: string;
  sheetRevision: number;
  cells: SheetCellUpdate[];
};

export const isSheetCellsOutput = (value: unknown): value is SheetCellsOutput => {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    o.kind === "sheet_cells" &&
    typeof o.sheetId === "string" &&
    typeof o.sheetRevision === "number" &&
    Array.isArray(o.cells)
  );
};
