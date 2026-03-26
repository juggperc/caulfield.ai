"use client";

import { WORKSPACE_SHEET_COLS, WORKSPACE_SHEET_ROWS } from "./limits";
import type { WorkspaceSheetCell } from "./sheets-types";

const CELL_REF_RE = /\b([A-Z]+)(\d+)\b/g;
const RANGE_RE = /([A-Z]+\d+):([A-Z]+\d+)/i;
const FUNCTION_RE = /^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA|IF|ROUND|ABS|INT|SQRT|VLOOKUP|AND|OR|NOT|LEFT|RIGHT|MID|LEN|TRIM|LOWER|UPPER|PROPER|CONCATENATE|CONCAT|ROUNDDOWN|ROUNDUP|POWER|EXP|LN|LOG|LOG10|PI|TODAY|NOW|DAYS|EDATE|EOMONTH|DATEDIF|CONCATENATE|SEARCH|FIND|SUBSTITUTE|REPT|VALUE|TEXT|ISBLANK|ISERROR|ISNA|ISNUMBER|ISTEXT|NOT|IFERROR)\((.*)\)$/i;

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
      if (sqrtVal < 0) return "#ERROR: Cannot calculate square root of negative number";
      return serializeNumber(Math.sqrt(sqrtVal));
    case "POWER":
      if (values.length < 2) return "#ERROR: POWER requires base and exponent";
      return serializeNumber(Math.pow(values[0], values[1]));
    case "EXP":
      return serializeNumber(Math.exp(values[0] ?? 0));
    case "LN":
      if ((values[0] ?? 0) <= 0) return "#ERROR: LN requires positive number";
      return serializeNumber(Math.log(values[0] ?? 0));
    case "LOG":
      if (values.length === 1) {
        if ((values[0] ?? 0) <= 0) return "#ERROR: LOG requires positive number";
        return serializeNumber(Math.log10(values[0]));
      }
      if ((values[0] ?? 0) <= 0 || (values[1] ?? 0) <= 0) return "#ERROR: LOG requires positive numbers";
      return serializeNumber(Math.log(values[1]) / Math.log(values[0]));
    case "LOG10":
      if ((values[0] ?? 0) <= 0) return "#ERROR: LOG10 requires positive number";
      return serializeNumber(Math.log10(values[0]));
    case "ROUNDDOWN":
      if (values.length < 1) return "#ERROR: ROUNDDOWN requires a number";
      const rdNum = values[0] ?? 0;
      const rdDecimals = Math.floor(values[1] ?? 0);
      const rdFactor = Math.pow(10, rdDecimals);
      return serializeNumber(Math.floor(rdNum * rdFactor) / rdFactor);
    case "ROUNDUP":
      if (values.length < 1) return "#ERROR: ROUNDUP requires a number";
      const ruNum = values[0] ?? 0;
      const ruDecimals = Math.floor(values[1] ?? 0);
      const ruFactor = Math.pow(10, ruDecimals);
      return serializeNumber(Math.ceil(ruNum * ruFactor) / ruFactor);
    case "PI":
      return serializeNumber(Math.PI);
    case "TODAY":
      return new Date().toISOString().slice(0, 10);
    case "NOW":
      return new Date().toISOString().slice(0, 19).replace("T", " ");
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

const getTextValues = (
  argsText: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): string[] => {
  const parts = argsText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const textValues: string[] = [];
  for (const part of parts) {
    const range = RANGE_RE.exec(part);
    if (range?.[1] && range[2]) {
      for (const coord of resolveRange(range[1], range[2])) {
        const value = evaluateCellDisplayValue(coord.row, coord.col, rows, seen);
        textValues.push(value);
      }
      continue;
    }

    const coord = parseCellRef(part);
    if (coord) {
      const value = evaluateCellDisplayValue(coord.row, coord.col, rows, seen);
      textValues.push(value);
      continue;
    }

    if (/^["'].*["']$/.test(part)) {
      textValues.push(part.slice(1, -1));
    } else {
      textValues.push(part);
    }
  }
  return textValues;
};

const evaluateTextFormula = (
  fnName: string,
  argsText: string,
  rows: WorkspaceSheetCell[][],
  seen: Set<string>,
): string => {
  const textParts = getTextValues(argsText, rows, seen);
  const first = textParts[0] ?? "";
  const second = textParts[1] ?? "";

  switch (fnName.toUpperCase()) {
    case "LEN":
      return String(first.length);
    case "TRIM":
      return first.trim();
    case "LOWER":
      return first.toLowerCase();
    case "UPPER":
      return first.toUpperCase();
    case "PROPER":
      return first.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    case "LEFT":
      if (textParts.length < 2) return "#ERROR: LEFT requires text and number of characters";
      const leftNum = Math.floor(Number(textParts[1]) || 1);
      return first.slice(0, leftNum);
    case "RIGHT":
      if (textParts.length < 2) return "#ERROR: RIGHT requires text and number of characters";
      const rightNum = Math.floor(Number(textParts[1]) || 1);
      return first.slice(-rightNum);
    case "MID":
      if (textParts.length < 3) return "#ERROR: MID requires text, start, and length";
      const midStart = Math.max(1, Math.floor(Number(textParts[1]) || 1)) - 1;
      const midLen = Math.floor(Number(textParts[2]) || 1);
      return first.slice(midStart, midStart + midLen);
    case "CONCATENATE":
    case "CONCAT":
      return textParts.join("");
    case "REPT":
      if (textParts.length < 2) return "#ERROR: REPT requires text and number";
      const reptTimes = Math.max(0, Math.floor(Number(textParts[1]) || 1));
      if (reptTimes > 1000) return "#ERROR: REPT count too large";
      return first.repeat(reptTimes);
    case "SUBSTITUTE":
      if (textParts.length < 3) return "#ERROR: SUBSTITUTE requires text, old, new";
      return first.split(textParts[1]).join(textParts[2]);
    case "SEARCH":
    case "FIND":
      if (textParts.length < 2) return "#ERROR: SEARCH requires text and search term";
      const searchPos = first.toLowerCase().indexOf(textParts[1].toLowerCase());
      if (searchPos === -1) return "#ERROR: Substring not found";
      return String(searchPos + 1);
    case "VALUE":
      const numVal = Number(first.replace(/[^0-9.-]/g, ""));
      return Number.isNaN(numVal) ? "#ERROR: Cannot convert to number" : serializeNumber(numVal);
    case "ISBLANK":
      return first === "" ? "TRUE" : "FALSE";
    case "ISNUMBER":
      return !Number.isNaN(Number(first)) && first.trim() !== "" ? "TRUE" : "FALSE";
    case "ISTEXT":
      return typeof first === "string" && first.trim() !== "" && Number.isNaN(Number(first)) ? "TRUE" : "FALSE";
    case "ISERROR":
      return first.startsWith("#ERROR") || first === "#CYCLE" || first === "#REF" ? "TRUE" : "FALSE";
    case "IFERROR":
      if (first.startsWith("#ERROR") || first === "#CYCLE" || first === "#REF") {
        return textParts[1] ?? "0";
      }
      return first;
    case "AND":
      return textParts.every((p) => p && p.toUpperCase() !== "FALSE" && p !== "0") ? "TRUE" : "FALSE";
    case "OR":
      return textParts.some((p) => p && p.toUpperCase() !== "FALSE" && p !== "0") ? "TRUE" : "FALSE";
    case "NOT":
      return first && first.toUpperCase() !== "FALSE" && first !== "0" ? "FALSE" : "TRUE";
    default:
      return "#ERROR";
  }
};

const textFunctions = new Set([
  "LEN", "TRIM", "LOWER", "UPPER", "PROPER", "LEFT", "RIGHT", "MID",
  "CONCATENATE", "CONCAT", "REPT", "SUBSTITUTE", "SEARCH", "FIND",
  "VALUE", "ISBLANK", "ISNUMBER", "ISTEXT", "ISERROR", "IFERROR",
  "AND", "OR", "NOT",
]);

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
    if (textFunctions.has(fnName)) {
      return evaluateTextFormula(fnName, fnMatch[2], rows, seen);
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
