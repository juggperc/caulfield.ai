import { tool } from "ai";
import type { FileSpecPayload } from "./file-spec";
import {
  spreadsheetInputSchema,
  textDocumentInputSchema,
  wordDocumentInputSchema,
} from "./file-spec";

const ensureExtension = (name: string, ext: string) => {
  const t = name.trim() || "document";
  const lower = t.toLowerCase();
  if (lower.endsWith(ext)) return t.slice(0, 180);
  return `${t.slice(0, 180 - ext.length)}${ext}`;
};

export const createDocumentCreationToolset = () => {
  const tools = {
    create_spreadsheet: tool({
      description:
        "Create an Excel workbook (.xlsx) from structured sheet data. The app will build the file in the browser for download. Use for tables, budgets, schedules. Do not paste raw grid data in chat—call this tool.",
      inputSchema: spreadsheetInputSchema,
      execute: async (input): Promise<FileSpecPayload> => {
        const filename = ensureExtension(input.filename, ".xlsx");
        return {
          kind: "file_spec",
          format: "xlsx",
          filename,
          spec: input,
          summary: `Spreadsheet “${filename}” (${input.sheets.length} sheet(s)).`,
        };
      },
    }),

    create_word_document: tool({
      description:
        "Create a Word document (.docx) with headings, paragraphs (bold/italic runs), and bullet lists. The app builds the file in the browser. Do not dump long prose in chat—use this tool.",
      inputSchema: wordDocumentInputSchema,
      execute: async (input): Promise<FileSpecPayload> => {
        const filename = ensureExtension(input.filename, ".docx");
        return {
          kind: "file_spec",
          format: "docx",
          filename,
          spec: input,
          summary: `Word document “${filename}” (${input.blocks.length} blocks).`,
        };
      },
    }),

    create_text_document: tool({
      description:
        "Create a plain text, Markdown, or CSV file for download. Use for scripts, data exports, or .md articles.",
      inputSchema: textDocumentInputSchema,
      execute: async (input): Promise<FileSpecPayload> => {
        const ext =
          input.format === "csv" ? ".csv" : input.format === "md" ? ".md" : ".txt";
        const filename = ensureExtension(input.filename, ext);
        return {
          kind: "file_spec",
          format: input.format,
          filename,
          spec: { content: input.content },
          summary: `Text file “${filename}” (${input.format}).`,
        };
      },
    }),
  };

  return { tools };
};
