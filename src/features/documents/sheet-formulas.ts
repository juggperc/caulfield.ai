"use client";

import { WORKSPACE_SHEET_COLS, WORKSPACE_SHEET_ROWS } from "./limits";
import type { WorkspaceSheetCell } from "./sheets-types";

const CELL_REF_RE = /\b([A-Z]+)(\d+)\b/g;
const RANGE_RE = /([A-Z]+\d+):([A-Z]+\d+)/i;
const FUNCTION_RE = /^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|IF|ROUND|ABS|INT|SQRT)\((.*)\)$/i;

type CellCoord = { row: number; col: number };

const colLabelToIndex = (label: string) => {
  let value = 0;
  for (const char of label.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }
  return value - 1;
};

const parseCellRef = (ref: string): CellCoord | null => {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!match) return null;

  const col = colLabelToIndex(match[1]);
  const row = Number.parseInt(match[2] ?? "", 10) - 1;

  if (
    !Number.isInteger(row) ||
    row < 0 ||
    row >= WORKSPACE_SHEET_ROWS ||
    col < 0 ||
    col >= WORKSPACE_SHEET_COLS
  ) {
    return null;
  }

  return { row, col };
};

const getNumericValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const serializeNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/\.?0+$/, "");

const resolveRange = (
  startRef: string,
  endRef: string,
): CellCoord[] => {
  const start = parseCellRef(startRef);
  const end = parseCellRef(endRef);
  if (!start || !end) return [];

  const rowMin = Math.min(start.row, end.row);
  const rowMax = Math.max(start.row, end.row);
  const colMin = Math.min(start.col, end.col);
  const colMax = Math.max(start.col, end.col);

  const coords: CellCoord[] = [];
  for (let row = rowMin; row <= rowMax; row += 1) {
    for (let col = colMin; col <= colMax; col += 1) {
      coords.push({ row, col });
    }
  }
  return coords;
};

const evaluateArithmeticFormula = (
  expression: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): string => {
  const replaced = expression.replace(CELL_REF_RE, (_match, colLabel, rowLabel) => {
    const coord = parseCellRef(`${colLabel}${rowLabel}`);
    if (!coord) {
      return "0";
    }
    const value = evaluateCellDisplayValue(coord.row, coord.col, rows, seen);
    const numeric = getNumericValue(value);
    return numeric === null ? "0" : String(numeric);
  });

  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
    return "#ERROR";
  }

  try {
    const result = Function(`"use strict"; return (${replaced});`)() as unknown;
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return "#ERROR";
    }
    return serializeNumber(result);
  } catch {
    return "#ERROR";
  }
};

const evaluateFunctionFormula = (
  fnName: string,
  argsText: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): string => {
  const parts = argsText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const values: number[] = [];
  for (const part of parts) {
    const range = RANGE_RE.exec(part);
    if (range?.[1] && range[2]) {
      for (const coord of resolveRange(range[1], range[2])) {
        const value = evaluateCellDisplayValue(coord.row, coord.col, rows, seen);
        const numeric = getNumericValue(value);
        if (numeric !== null) {
          values.push(numeric);
        }
      }
      continue;
    }

    const coord = parseCellRef(part);
    if (coord) {
      const value = evaluateCellDisplayValue(coord.row, coord.col, rows, seen);
      const numeric = getNumericValue(value);
      if (numeric !== null) {
        values.push(numeric);
      }
      continue;
    }

    const numeric = getNumericValue(part);
    if (numeric !== null) {
      values.push(numeric);
    }
  }

  if (values.length === 0) {
    return "0";
  }

  switch (fnName.toUpperCase()) {
    case "SUM":
      return serializeNumber(values.reduce((sum, value) => sum + value, 0));
    case "AVERAGE":
      return serializeNumber(
        values.reduce((sum, value) => sum + value, 0) / values.length,
      );
    case "MIN":
      return serializeNumber(Math.min(...values));
    case "MAX":
      return serializeNumber(Math.max(...values));
    case "COUNT":
      return String(values.length);
    case "COUNTA":
      return String(values.length);
    case "ROUND":
      if (values.length < 2) return serializeNumber(Math.round(values[0] ?? 0));
      const roundNum = values[0] ?? 0;
      const decimals = Math.floor(values[1] ?? 0);
      return serializeNumber(Number(roundNum.toFixed(Math.max(0, decimals))));
    case "ABS":
      return serializeNumber(Math.abs(values[0] ?? 0));
    case "INT":
      return serializeNumber(Math.floor(values[0] ?? 0));
    case "SQRT":
      const sqrtVal = values[0] ?? 0;
      if (sqrtVal < 0) return "#ERROR";
      return serializeNumber(Math.sqrt(sqrtVal));
    default:
      return "#ERROR";
  }
};

const evaluateIfFormula = (
  argsText: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): string => {
  const args = splitIfArgs(argsText);
  if (args.length < 2) return "#ERROR";

  const [conditionExpr, trueExpr, falseExpr] = args;
  if (!conditionExpr) return "#ERROR";

  const conditionResult = evaluateCondition(conditionExpr.trim(), rows, seen);
  const resultExpr = conditionResult ? trueExpr : (falseExpr ?? "0");

  const trimmedResult = resultExpr.trim();
  if (!trimmedResult) return "0";

  if (/^["'].*["']$/.test(trimmedResult)) {
    return trimmedResult.slice(1, -1);
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmedResult)) {
    return trimmedResult;
  }

  const parsed = Number(trimmedResult);
  if (!Number.isNaN(parsed)) return serializeNumber(parsed);

  return evaluateFormula(`=${trimmedResult}`, rows, seen);
};

const splitIfArgs = (argsText: string): string[] => {
  const args: string[] = [];
  let current = "";
  let parenDepth = 0;
  let quoteChar: string | null = null;

  for (const char of argsText) {
    if (quoteChar) {
      current += char;
      if (char === quoteChar) quoteChar = null;
    } else if (char === '"' || char === "'") {
      current += char;
      quoteChar = char;
    } else if (char === "(") {
      current += char;
      parenDepth += 1;
    } else if (char === ")") {
      current += char;
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (char === "," && parenDepth === 0) {
      args.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  args.push(current);
  return args;
};

const evaluateCondition = (
  expr: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): boolean => {
  const operators = ["<=", ">=", "<>", "<", ">", "="];
  for (const op of operators) {
    if (expr.includes(op)) {
      const parts = expr.split(op);
      if (parts.length === 2) {
        const left = evaluateConditionValue(parts[0].trim(), rows, seen);
        const right = evaluateConditionValue(parts[1].trim(), rows, seen);

        const leftNum = Number(left);
        const rightNum = Number(right);
        const bothNumbers = !Number.isNaN(leftNum) && !Number.isNaN(rightNum);

        if (op === "=" || op == "<>") return left === right;
        if (op == "<") return bothNumbers ? leftNum < rightNum : left < right;
        if (op == ">") return bothNumbers ? leftNum > rightNum : left > right;
        if (op == "<=") return bothNumbers ? leftNum <= rightNum : left <= right;
        if (op == ">=") return bothNumbers ? leftNum >= rightNum : left >= right;
      }
    }
  }

  const val = evaluateConditionValue(expr, rows, seen);
  const num = Number(val);
  if (!Number.isNaN(num)) return num !== 0;
  return val.length > 0 && val.toLowerCase() !== "false";
};

const evaluateConditionValue = (
  expr: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): string => {
  const trimmed = expr.trim();
  if (/^["'].*["']$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }
  const coord = parseCellRef(trimmed);
  if (coord) {
    return evaluateCellDisplayValue(coord.row, coord.col, rows, seen);
  }
  return trimmed;
};

export const evaluateFormula = (
  formula: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): string => {
  const trimmed = formula.trim();
  if (!trimmed.startsWith("=")) {
    return trimmed;
  }

  const body = trimmed.slice(1).trim();
  if (!body) {
    return "";
  }

  const fnMatch = FUNCTION_RE.exec(body);
  if (fnMatch?.[1] && fnMatch[2] !== undefined) {
    const fnName = fnMatch[1].toUpperCase();
    if (fnName === "IF") {
      return evaluateIfFormula(fnMatch[2], rows, seen);
    }
    return evaluateFunctionFormula(fnName, fnMatch[2], rows, seen);
  }

  return evaluateArithmeticFormula(body, rows, seen);
};

export const evaluateCellDisplayValue = (
  row: number,
  col: number,
  rows: WorkspaceSheetCell[][],
  seen = new Set<string>(),
): string => {
  const key = `${row}:${col}`;
  if (seen.has(key)) {
    return "#CYCLE";
  }

  const cell = rows[row]?.[col];
  if (!cell) {
    return "";
  }

  if (!cell.raw.trim().startsWith("=")) {
    return cell.raw;
  }

  const nextSeen = new Set(seen);
  nextSeen.add(key);
  return evaluateFormula(cell.raw, rows, nextSeen);
};

export const evaluateSheetRows = (
  rows: WorkspaceSheetCell[][],
): WorkspaceSheetCell[][] =>
  rows.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      raw: cell.raw,
      display: evaluateCellDisplayValue(rowIndex, colIndex, rows),
    })),
  );

export const buildEvaluatedSheetGrid = evaluateSheetRows;

export const recalculateSheet = <T extends { rows: WorkspaceSheetCell[][] }>(
  sheet: T,
): T => ({
  ...sheet,
  rows: evaluateSheetRows(sheet.rows),
});
