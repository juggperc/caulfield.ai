import { tool } from "ai";
import { z } from "zod";

export type WorkspaceReadDocRow = {
  id: string;
  title: string;
  plainText: string;
};

export type WorkspaceReadSheetRow = {
  id: string;
  title: string;
  csvPreview: string;
};

const truncate = (s: string, max: number) => {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n…(truncated)`;
};

export const createWorkspaceReadToolset = (
  docs: WorkspaceReadDocRow[],
  sheets: WorkspaceReadSheetRow[],
  maxChars: number,
) => {
  const docById = new Map(docs.map((d) => [d.id, d]));
  const sheetById = new Map(sheets.map((s) => [s.id, s]));

  const tools = {
    workspace_read_document: tool({
      description:
        "Read the full plain-text content of a workspace document by id (from the Workspace index). Use when excerpts are not enough.",
      inputSchema: z.object({
        id: z.string().describe("Document id from the workspace index"),
      }),
      execute: async ({ id }) => {
        const d = docById.get(id);
        if (!d) {
          return {
            kind: "workspace_read_error" as const,
            message:
              "Unknown document id. Use ids listed in the Workspace index.",
          };
        }
        return {
          kind: "workspace_document" as const,
          id: d.id,
          title: d.title,
          text: truncate(d.plainText, maxChars),
        };
      },
    }),
    workspace_read_sheet: tool({
      description:
        "Read CSV/tabular preview of a workspace sheet by id (from the Workspace index).",
      inputSchema: z.object({
        id: z.string().describe("Sheet id from the workspace index"),
      }),
      execute: async ({ id }) => {
        const s = sheetById.get(id);
        if (!s) {
          return {
            kind: "workspace_read_error" as const,
            message: "Unknown sheet id. Use ids listed in the Workspace index.",
          };
        }
        return {
          kind: "workspace_sheet" as const,
          id: s.id,
          title: s.title,
          csvPreview: truncate(s.csvPreview, maxChars),
        };
      },
    }),
  };

  return { tools };
};
