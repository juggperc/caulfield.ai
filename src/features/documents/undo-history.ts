"use client";

type HistoryEntry<T> = {
 state: T;
 timestamp: number;
 description?: string;
};

export class UndoHistory<T> {
 private history: HistoryEntry<T>[] = [];
 private currentIndex: number = -1;
 private maxEntries: number;

 constructor(maxEntries: number = 50) {
 this.maxEntries = maxEntries;
 }

 push(state: T, description?: string): void {
 if (this.currentIndex < this.history.length - 1) {
 this.history = this.history.slice(0, this.currentIndex + 1);
 }

 this.history.push({
 state: JSON.parse(JSON.stringify(state)),
 timestamp: Date.now(),
 description,
 });

 if (this.history.length > this.maxEntries) {
 this.history.shift();
 } else {
 this.currentIndex++;
 }
 }

 canUndo(): boolean {
 return this.currentIndex > 0;
 }

 canRedo(): boolean {
 return this.currentIndex < this.history.length - 1;
 }

 undo(): T | null {
 if (!this.canUndo()) return null;
 this.currentIndex--;
 return JSON.parse(JSON.stringify(this.history[this.currentIndex]!.state));
 }

 redo(): T | null {
 if (!this.canRedo()) return null;
 this.currentIndex++;
 return JSON.parse(JSON.stringify(this.history[this.currentIndex]!.state));
 }

 getCurrent(): T | null {
 if (this.currentIndex < 0 || this.currentIndex >= this.history.length) return null;
 return JSON.parse(JSON.stringify(this.history[this.currentIndex]!.state));
 }

 getHistoryLength(): number {
 return this.history.length;
 }

 getCurrentIndex(): number {
 return this.currentIndex;
 }

 clear(): void {
 this.history = [];
 this.currentIndex = -1;
 }
}

export type DocHistoryState = {
 revision: number;
 content: unknown;
};

export type SheetHistoryState = {
 id: string;
 revision: number;
 rows: unknown[][];
};

let docHistory: UndoHistory<DocHistoryState> | null = null;
const sheetHistories: Map<string, UndoHistory<SheetHistoryState>> = new Map();

export const getDocHistory = (): UndoHistory<DocHistoryState> => {
 if (!docHistory) {
 docHistory = new UndoHistory<DocHistoryState>(50);
 }
 return docHistory;
};

export const getSheetHistory = (sheetId: string): UndoHistory<SheetHistoryState> => {
 if (!sheetHistories.has(sheetId)) {
 sheetHistories.set(sheetId, new UndoHistory<SheetHistoryState>(50));
 }
 return sheetHistories.get(sheetId)!;
};

export const clearDocHistory = (): void => {
 if (docHistory) {
 docHistory.clear();
 }
};

export const clearSheetHistory = (sheetId: string): void => {
 sheetHistories.delete(sheetId);
};

export const clearAllHistories = (): void => {
 if (docHistory) {
 docHistory.clear();
 }
 sheetHistories.clear();
};