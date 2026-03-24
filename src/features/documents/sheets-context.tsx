"use client";

import { scopedStorageKey } from "@/features/auth/storage-scope";
import { useSession } from "@/features/auth/session-context";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SHEETS_LOCAL_STORAGE_KEY } from "./sheets-constants";
import { evaluateSheetRows } from "./sheet-formulas";
import {
  normalizeWorkspaceSheet,
  normalizeWorkspaceSheetList,
} from "./sheets-normalize";
import type { WorkspaceSheet, WorkspaceSheetCell } from "./sheets-types";

type SheetsContextValue = {
  sheets: WorkspaceSheet[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedSheet: WorkspaceSheet | undefined;
  createSheet: () => void;
  deleteSheet: (id: string) => void;
  updateSheetTitle: (id: string, title: string) => void;
  updateCellInput: (id: string, r: number, c: number, raw: string) => void;
  replaceSheetGrid: (id: string, rows: WorkspaceSheetCell[][]) => void;
  applyAgentSheetUpdate: (
    id: string,
    rows: WorkspaceSheetCell[][],
    newRevision: number,
  ) => void;
  importSheet: (sheet: WorkspaceSheet) => void;
  addSheetRow: (id: string) => void;
  addSheetColumn: (id: string) => void;
};

const SheetsContext = createContext<SheetsContextValue | null>(null);

export const SheetsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSession();
  const [sheets, setSheets] = useState<WorkspaceSheet[]>([]);
  const [selectionUser, setSelectionUser] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const storageKey = scopedStorageKey(SHEETS_LOCAL_STORAGE_KEY);

  useEffect(() => {
    if (!user?.id) return;
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          setSheets([]);
          setHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        setSheets(normalizeWorkspaceSheetList(parsed));
      } catch {
        /* ignore */
      }
      setHydrated(true);
    });
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!hydrated || !user?.id) return;
    localStorage.setItem(storageKey, JSON.stringify(sheets));
  }, [sheets, hydrated, storageKey, user?.id]);

  const sorted = useMemo(
    () => [...sheets].sort((a, b) => b.updatedAt - a.updatedAt),
    [sheets],
  );

  const selectedId = useMemo(() => {
    if (sheets.length === 0) return null;
    if (
      selectionUser != null &&
      sheets.some((s) => s.id === selectionUser)
    ) {
      return selectionUser;
    }
    return sorted[0]?.id ?? null;
  }, [sheets, selectionUser, sorted]);

  const setSelectedId = useCallback((id: string | null) => {
    setSelectionUser(id);
  }, []);

  const selectedSheet = sheets.find((s) => s.id === selectedId);

  const createSheet = useCallback(() => {
    const now = Date.now();
    const id = crypto.randomUUID();
    const base = normalizeWorkspaceSheet({
      id,
      title: "Untitled sheet",
      createdAt: now,
      updatedAt: now,
      revision: 0,
      rows: [],
    });
    if (!base) return;
    setSheets((prev) => [base, ...prev]);
    setSelectionUser(id);
  }, []);

  const deleteSheet = useCallback((id: string) => {
    setSelectionUser((cur) => (cur === id ? null : cur));
    setSheets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateSheetTitle = useCallback((id: string, title: string) => {
    setSheets((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          title: title.trim() || "Untitled sheet",
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const updateCellInput = useCallback(
    (id: string, r: number, c: number, raw: string) => {
      setSheets((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const rows = s.rows.map((row) => row.map((cell) => ({ ...cell })));
          while (rows.length <= r) {
            rows.push(
              Array.from(
                { length: rows[0]?.length ?? 12 },
                () => ({ raw: "", display: "" }),
              ),
            );
          }
          const row = [...rows[r]];
          while (row.length <= c) row.push({ raw: "", display: "" });
          row[c] = { raw, display: raw };
          const nextRows = [...rows];
          nextRows[r] = row;
          return {
            ...s,
            rows: evaluateSheetRows(nextRows),
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const replaceSheetGrid = useCallback((id: string, rows: WorkspaceSheetCell[][]) => {
    setSheets((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          rows: evaluateSheetRows(rows),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const applyAgentSheetUpdate = useCallback(
    (id: string, rows: WorkspaceSheetCell[][], newRevision: number) => {
      setSheets((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          return {
            ...s,
            rows: evaluateSheetRows(rows),
            revision: newRevision,
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const importSheet = useCallback((sheet: WorkspaceSheet) => {
    setSheets((prev) => [sheet, ...prev]);
    setSelectionUser(sheet.id);
  }, []);

  const addSheetRow = useCallback((id: string) => {
    setSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== id) return sheet;
        const nextRows = [
          ...sheet.rows.map((row) => row.map((cell) => ({ ...cell }))),
          Array.from({ length: sheet.rows[0]?.length ?? 12 }, () => ({
            raw: "",
            display: "",
          })),
        ];
        return {
          ...sheet,
          rows: evaluateSheetRows(nextRows),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const addSheetColumn = useCallback((id: string) => {
    setSheets((prev) =>
      prev.map((sheet) => {
        if (sheet.id !== id) return sheet;
        const nextRows = sheet.rows.map((row) => [
          ...row.map((cell) => ({ ...cell })),
          { raw: "", display: "" },
        ]);
        return {
          ...sheet,
          rows: evaluateSheetRows(nextRows),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const value = useMemo(
    () => ({
      sheets,
      selectedId,
      setSelectedId,
      selectedSheet,
      createSheet,
      deleteSheet,
      updateSheetTitle,
      updateCellInput,
      replaceSheetGrid,
      applyAgentSheetUpdate,
      importSheet,
      addSheetRow,
      addSheetColumn,
    }),
    [
      sheets,
      selectedId,
      setSelectedId,
      selectedSheet,
      createSheet,
      deleteSheet,
      updateSheetTitle,
      updateCellInput,
      replaceSheetGrid,
      applyAgentSheetUpdate,
      importSheet,
      addSheetRow,
      addSheetColumn,
    ],
  );

  return (
    <SheetsContext.Provider value={value}>{children}</SheetsContext.Provider>
  );
};

export const useSheets = () => {
  const ctx = useContext(SheetsContext);
  if (!ctx) {
    throw new Error("useSheets must be used within SheetsProvider");
  }
  return ctx;
};
