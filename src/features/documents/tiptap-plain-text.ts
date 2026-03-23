import type { JSONContent } from "@tiptap/core";

const walk = (node: unknown, acc: string[]): void => {
  if (!node || typeof node !== "object") return;
  const n = node as JSONContent;
  if (typeof n.text === "string" && n.text.length > 0) acc.push(n.text);
  if (Array.isArray(n.content)) {
    for (const child of n.content) walk(child, acc);
  }
};

/** Flatten TipTap/ProseMirror JSON to plain text (paragraphs joined by newlines). */
export const tiptapJsonToPlainText = (root: unknown): string => {
  const acc: string[] = [];
  walk(root, acc);
  return acc.join("\n");
};
