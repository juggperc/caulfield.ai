"use client";

import type { JSONContent } from "@tiptap/core";
import { Packer } from "docx";
import {
  Document,
  HeadingLevel,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from "docx";
import mammoth from "mammoth";
import Papa from "papaparse";

import type { WorkspaceSheet } from "./sheets-types";
import { emptyTipTapDoc, type WorkspaceDoc } from "./types";

const sanitizeFilenameStem = (value: string, fallback: string) => {
  const trimmed = value.trim();
  const safe = (trimmed || fallback).replace(/[^\w.-]+/g, "_");
  return safe.length > 0 ? safe : fallback;
};

const nodeRuns = (node: JSONContent | undefined): TextRun[] => {
  if (!node) return [];
  if (node.type === "text" && typeof node.text === "string") {
    return [
      new TextRun({
        text: node.text,
        bold: Boolean(node.marks?.some((mark) => mark.type === "bold")),
        italics: Boolean(node.marks?.some((mark) => mark.type === "italic")),
        underline: node.marks?.some((mark) => mark.type === "underline")
          ? {}
          : undefined,
      }),
    ];
  }
  if (!Array.isArray(node.content)) return [];
  return node.content.flatMap((child) => nodeRuns(child));
};

const tableRowToNode = (cells: string[]): JSONContent => ({
  type: "tableRow",
  content: cells.map((cell) => ({
    type: "tableCell",
    content: [
      {
        type: "paragraph",
        content: cell ? [{ type: "text", text: cell }] : [],
      },
    ],
  })),
});

export const csvTextToTipTapDoc = (csvText: string): JSONContent => {
  const parsed = Papa.parse<string[]>(csvText.trim(), {
    skipEmptyLines: false,
  });
  const rows = parsed.data.filter((row) => Array.isArray(row));
  if (rows.length === 0) {
    return emptyTipTapDoc();
  }

  return {
    type: "doc",
    content: [
      {
        type: "table",
        content: rows.map((row) => tableRowToNode(row)),
      },
    ],
  };
};

const tipTapNodeToDocxBlock = (node: JSONContent): Paragraph | Table | null => {
  if (node.type === "heading") {
    const level =
      node.attrs?.level === 1
        ? HeadingLevel.HEADING_1
        : node.attrs?.level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;
    return new Paragraph({
      heading: level,
      children: nodeRuns(node),
    });
  }

  if (node.type === "paragraph") {
    return new Paragraph({
      children: nodeRuns(node),
    });
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const items = node.content ?? [];
    return new Paragraph({
      children: items.flatMap((item) => nodeRuns(item)),
    });
  }

  if (node.type === "table") {
    const rows = (node.content ?? []).map((row) => {
      const cells = (row.content ?? []).map(
        (cell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: nodeRuns(cell),
              }),
            ],
          }),
      );
      return new TableRow({ children: cells });
    });
    return new Table({ rows });
  }

  return null;
};

export const tipTapDocToDocxBlob = async (
  title: string,
  contentJson: JSONContent,
) => {
  const blocks = (contentJson.content ?? [])
    .map((node) => tipTapNodeToDocxBlock(node))
    .filter((node): node is Paragraph | Table => node !== null);

  const document = new Document({
    sections: [
      {
        children:
          blocks.length > 0
            ? blocks
            : [new Paragraph({ children: [new TextRun(title || "Document")] })],
      },
    ],
  });

  return Packer.toBlob(document);
};

const htmlParagraphToNode = (html: string): JSONContent[] => {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return [];
  return [
    {
      type: "paragraph",
      content: [{ type: "text", text }],
    },
  ];
};

export const buildWorkspaceDocFromDocxFile = async (
  file: File,
): Promise<WorkspaceDoc> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const blocks = result.value
    .split(/<\/p>|<\/h1>|<\/h2>|<\/h3>|<\/li>/i)
    .flatMap((fragment) => htmlParagraphToNode(fragment));

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.docx$/i, "") || "Imported document",
    format: "docx",
    createdAt: now,
    updatedAt: now,
    revision: 0,
    contentJson: {
      type: "doc",
      content: blocks.length > 0 ? blocks : emptyTipTapDoc().content,
    },
  };
};

export const downloadBlob = (
  blob: Blob,
  filenameStem: string,
  extension: ".docx" | ".csv",
) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFilenameStem(filenameStem, "document")}${extension}`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
};

export const serializeSheetToCsv = (sheet: WorkspaceSheet): string =>
  Papa.unparse(
    sheet.rows.map((row: WorkspaceSheet["rows"][number]) =>
      row.map((cell: WorkspaceSheet["rows"][number][number]) => cell.display),
    ),
  );

export const buildCsvFromDoc = (doc: WorkspaceDoc): string => {
  const blocks = doc.contentJson.content ?? [];
  const rows = blocks.map((block) => {
    if (block.type === "table") {
      return (block.content ?? []).flatMap((row) =>
        (row.content ?? []).map((cell) =>
          cell.content
            ?.map((child) =>
              child.content
                ?.map((grandChild) => (grandChild.text ? grandChild.text : ""))
                .join(""),
            )
            .join(" ") ?? "",
        ),
      );
    }
    const text =
      block.content
        ?.map((child) =>
          child.content
            ?.map((grandChild) => (grandChild.text ? grandChild.text : ""))
            .join("") ?? child.text ?? "",
        )
        .join(" ") ?? "";
    return [text];
  });

  return Papa.unparse(rows);
};

export const importCsvFileAsSheet = async (file: File) => {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: false,
  });
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.csv$/i, "") || "Imported sheet",
    createdAt: now,
    updatedAt: now,
    revision: 0,
    rows: parsed.data.map((row) =>
      row.map((value) => ({
        raw: value ?? "",
        display: value ?? "",
      })),
    ),
  };
};

export const buildWorkspaceDocFromCsvFile = async (
  file: File,
): Promise<WorkspaceDoc> => {
  const text = await file.text();
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.csv$/i, "") || "Imported document",
    format: "csv",
    createdAt: now,
    updatedAt: now,
    revision: 0,
    contentJson: csvTextToTipTapDoc(text),
  };
};

export const buildDocxBlobFromWorkspaceDoc = async (doc: WorkspaceDoc) =>
  tipTapDocToDocxBlob(doc.title, doc.contentJson);
