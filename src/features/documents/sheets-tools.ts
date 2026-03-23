import { tool } from "ai";
import { z } from "zod";
import type { SheetCellsOutput } from "./file-spec";
import {
  MAX_CELL_LENGTH,
  MAX_SHEET_CELLS_PER_TOOL_CALL,
} from "./limits";

export type SheetToolContext = {
  readonly sheetsById: Map<
    string,
    { revision: number; title: string; rowCount: number; colCount: number }
  >;
  readonly defaultSheetId: string | undefined;
};

export const createSheetsToolset = (ctx: SheetToolContext) => {
  const cellSchema = z.object({
    r: z.number().int().min(0).describe("Row index (0-based)"),
    c: z.number().int().min(0).describe("Column index (0-based)"),
    value: z
      .string()
      .max(MAX_CELL_LENGTH)
      .describe("Cell text (empty string clears visually)"),
  });

  const tools = {
    sheets_apply_cells: tool({
      description: `Apply cell updates to a workspace sheet. sheetRevision MUST match the sheet's revision in context or the client rejects the update.

Use for tabular data in the Sheets tab. Prefer many small calls over one huge payload.`,
      inputSchema: z.object({
        sheetId: z
          .string()
          .optional()
          .describe(
            "Target sheet id; omit to use the active sheet from context",
          ),
        sheetRevision: z
          .number()
          .int()
          .describe("Must match current sheet revision from system context"),
        cells: z
          .array(cellSchema)
          .min(1)
          .max(MAX_SHEET_CELLS_PER_TOOL_CALL),
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
          throw new Error(
            "Unknown sheet id. Use sheet ids from the Active sheet / Workspace sheets section in context.",
          );
        }
        return {
          kind: "sheet_cells",
          sheetId: sid,
          sheetRevision,
          cells,
        };
      },
    }),
  };

  return { tools };
};
