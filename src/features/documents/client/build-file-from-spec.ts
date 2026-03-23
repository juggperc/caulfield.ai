"use client";

import type { FileSpecPayload } from "@/features/documents/file-spec";
import type { WordDocumentInput } from "@/features/documents/file-spec";

const mimeForFormat = (format: FileSpecPayload["format"]): string => {
  switch (format) {
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "csv":
      return "text/csv;charset=utf-8";
    case "md":
      return "text/markdown;charset=utf-8";
    default:
      return "text/plain;charset=utf-8";
  }
};

const padRows = (rows: string[][], maxCols: number): string[][] =>
  rows.map((row) => {
    const next = [...row];
    while (next.length < maxCols) next.push("");
    return next.slice(0, maxCols);
  });

const buildXlsxBlob = async (spec: FileSpecPayload & { format: "xlsx" }) => {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  for (const sheet of spec.spec.sheets) {
    const name = sheet.name.slice(0, 31) || "Sheet1";
    const ws = wb.addWorksheet(name);
    const maxCols = Math.min(
      sheet.rows.reduce((m, r) => Math.max(m, r.length), 0),
      50,
    );
    const rows = padRows(sheet.rows as string[][], maxCols || 1);
    rows.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        ws.getCell(ri + 1, ci + 1).value = cell;
      });
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: mimeForFormat("xlsx") });
};

const buildDocxBlob = async (spec: WordDocumentInput) => {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const children: InstanceType<typeof Paragraph>[] = [];

  for (const block of spec.blocks) {
    if (block.type === "heading") {
      const heading =
        block.level === 1
          ? HeadingLevel.HEADING_1
          : block.level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      children.push(
        new Paragraph({
          text: block.text,
          heading,
        }),
      );
      continue;
    }
    if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          children: block.runs.map(
            (r) =>
              new TextRun({
                text: r.text,
                bold: r.bold,
                italics: r.italic,
              }),
          ),
        }),
      );
      continue;
    }
    for (const item of block.items) {
      children.push(
        new Paragraph({
          text: item,
          bullet: { level: 0 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
};

export const buildBlobFromFileSpec = async (
  payload: FileSpecPayload,
): Promise<Blob> => {
  switch (payload.format) {
    case "xlsx":
      return buildXlsxBlob(payload);
    case "docx":
      return buildDocxBlob(payload.spec as WordDocumentInput);
    case "csv":
    case "md":
    case "txt":
      return new Blob([payload.spec.content], {
        type: mimeForFormat(payload.format),
      });
    default: {
      const _exhaustive: never = payload;
      void _exhaustive;
      throw new Error("Unsupported file format");
    }
  }
};
