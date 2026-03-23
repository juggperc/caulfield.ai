import { tool } from "ai";
import { z } from "zod";
import type { DocEditsOutput } from "./file-spec";
import { MAX_DOC_EDITS_PER_CALL } from "./limits";

const replaceRangeSchema = z.object({
  type: z.literal("replace_range"),
  from: z
    .number()
    .int()
    .describe("ProseMirror position (inclusive) start of range to replace"),
  to: z
    .number()
    .int()
    .describe("ProseMirror position (exclusive) end of range to replace"),
  content: z
    .unknown()
    .describe(
      "TipTap/ProseMirror JSON fragment, e.g. a paragraph node with text children",
    ),
});

const insertAtSchema = z.object({
  type: z.literal("insert_at"),
  pos: z
    .number()
    .int()
    .describe("ProseMirror position where content is inserted (no deletion)"),
  content: z
    .unknown()
    .describe("TipTap/ProseMirror JSON to insert at pos"),
});

const deleteRangeSchema = z.object({
  type: z.literal("delete_range"),
  from: z
    .number()
    .int()
    .describe("ProseMirror position (inclusive) start of range to delete"),
  to: z
    .number()
    .int()
    .describe("ProseMirror position (exclusive) end of range to delete"),
});

const docEditSchema = z.discriminatedUnion("type", [
  replaceRangeSchema,
  insertAtSchema,
  deleteRangeSchema,
]);

const editsArrayBounded = z
  .array(docEditSchema)
  .min(1)
  .max(MAX_DOC_EDITS_PER_CALL);

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const isSingleEditObject = (v: unknown): boolean =>
  isRecord(v) &&
  typeof v.type === "string" &&
  (v.type === "replace_range" ||
    v.type === "insert_at" ||
    v.type === "delete_range");

/**
 * Unwrap `edits` from models that send a JSON string, double-encoded JSON, etc.
 */
const unwrapEditsInput = (val: unknown): unknown => {
  let v: unknown = val;
  for (let i = 0; i < 12; i++) {
    if (typeof v !== "string") break;
    const t = v.trim();
    if (!t) break;
    try {
      v = JSON.parse(t) as unknown;
    } catch {
      return val;
    }
  }
  if (Array.isArray(v)) return v;
  if (isSingleEditObject(v)) return [v];
  return val;
};

const editsSchema = z.preprocess(
  (val) => unwrapEditsInput(val),
  editsArrayBounded,
);

/**
 * TipTap `insertContentAt` should not receive a top-level `doc` node; unwrap to blocks.
 * Also accept prose as string or stringified JSON.
 */
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

  if (isRecord(content) && content.type === "doc" && Array.isArray(content.content)) {
    const nodes = content.content as unknown[];
    if (nodes.length === 1) return nodes[0];
    return nodes;
  }

  return content;
};

export const createDocsEditorToolset = () => {
  const tools = {
    docs_apply_edits: tool({
      description: `Apply structured edits to the open document. docRevision MUST equal the revision number provided in the system context or the client will reject the edit.

**Edit types:**
- \`replace_range\`: delete \`from\`–\`to\` (half-open) and insert \`content\` at \`from\`.
- \`insert_at\`: insert \`content\` at \`pos\` without deleting.
- \`delete_range\`: delete \`from\`–\`to\` only.

**Payload size:** Keep each tool call small. For a long story, prefer **several** \`insert_at\` calls at the document end, or one \`replace_range\` with an array of \`paragraph\` nodes (not a megabyte of escaped string). If the provider stringifies \`edits\`, pass a real JSON array when possible.

**edits** may be a JSON **array**, a **single** edit object, or a **string** containing JSON (including double-encoded). The server unwraps strings before validation.

Prefer \`paragraph\` nodes with \`text\` children. A full \`doc\` node in \`content\` is unwrapped server-side.

Example:
\`\`\`json
{
  "docRevision": 0,
  "edits": [
    {
      "type": "replace_range",
      "from": 0,
      "to": 0,
      "content": { "type": "paragraph", "content": [{ "type": "text", "text": "First paragraph." }] }
    }
  ]
}
\`\`\``,
      inputSchema: z.object({
        docRevision: z
          .number()
          .int()
          .describe("Must match the current document revision from context"),
        edits: editsSchema,
      }),
      execute: async (input): Promise<DocEditsOutput> => ({
        kind: "doc_edits",
        docRevision: input.docRevision,
        edits: input.edits.map((e) => {
          if (e.type === "delete_range") return e;
          return {
            ...e,
            content: coerceTipTapContent(e.content),
          };
        }),
      }),
    }),
  };

  return { tools };
};
