import type { JSONContent } from "@tiptap/core";

export type WorkspaceDoc = {
  id: string;
  title: string;
  format: "rich" | "docx" | "csv" | "md" | "txt";
  createdAt: number;
  updatedAt: number;
  /** Incremented only after a successful agent edit (client-side); used to reject stale tool calls. */
  revision: number;
  contentJson: JSONContent;
};

export const emptyTipTapDoc = (): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
