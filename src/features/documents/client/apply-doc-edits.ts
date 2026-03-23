"use client";

import type { DocEdit, DocEditsOutput } from "@/features/documents/file-spec";
import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

const editAnchor = (e: DocEdit): number => {
  if (e.type === "insert_at") return e.pos;
  return e.from;
};

const validateRange = (
  from: number,
  to: number,
  size: number,
  label: string,
):
  | { ok: true }
  | { ok: false; reason: string } => {
  if (from < 0 || to > size || from > to) {
    return {
      ok: false,
      reason: `Invalid ${label} range from=${from} to=${to} (doc size ${size}).`,
    };
  }
  return { ok: true };
};

export const applyDocEditsToEditor = (
  editor: Editor,
  payload: DocEditsOutput,
  currentRevision: number,
):
  | { ok: true; newRevision: number }
  | { ok: false; reason: string } => {
  if (payload.docRevision !== currentRevision) {
    return {
      ok: false,
      reason: `Revision mismatch (document is at ${currentRevision}, edits target ${payload.docRevision}).`,
    };
  }

  const sorted = [...payload.edits].sort(
    (a, b) => editAnchor(b) - editAnchor(a),
  );

  editor.chain().focus().run();
  for (const edit of sorted) {
    const { doc } = editor.state;
    const size = doc.content.size;

    if (edit.type === "replace_range") {
      const { from, to } = edit;
      const vr = validateRange(from, to, size, "replace_range");
      if (!vr.ok) return vr;
      editor
        .chain()
        .deleteRange({ from, to })
        .insertContentAt(from, edit.content as JSONContent)
        .run();
      continue;
    }

    if (edit.type === "delete_range") {
      const { from, to } = edit;
      const vr = validateRange(from, to, size, "delete_range");
      if (!vr.ok) return vr;
      editor.chain().deleteRange({ from, to }).run();
      continue;
    }

    if (edit.type === "insert_at") {
      const { pos } = edit;
      if (pos < 0 || pos > size) {
        return {
          ok: false,
          reason: `Invalid insert_at pos=${pos} (doc size ${size}).`,
        };
      }
      editor
        .chain()
        .insertContentAt(pos, edit.content as JSONContent)
        .run();
    }
  }

  return { ok: true, newRevision: currentRevision + 1 };
};

/** Apply multiple tool results from one assistant turn; only the first must match startRevision. */
export const applyDocEditsBatchToEditor = (
  editor: Editor,
  payloads: DocEditsOutput[],
  startRevision: number,
):
  | { ok: true; newRevision: number }
  | { ok: false; reason: string } => {
  if (payloads.length === 0) {
    return { ok: true, newRevision: startRevision };
  }
  let rev = startRevision;
  for (let i = 0; i < payloads.length; i++) {
    const p = payloads[i];
    const toApply: DocEditsOutput =
      i === 0 ? p : { ...p, docRevision: rev };
    const step = applyDocEditsToEditor(editor, toApply, rev);
    if (!step.ok) return step;
    rev = step.newRevision;
  }
  return { ok: true, newRevision: rev };
};
