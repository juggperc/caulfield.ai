"use client";

import { useEffect, useState } from "react";
import { FormulaBuilder } from "./FormulaBuilder";
import { getPendingCellRef, clearPendingCellRef } from "./cell-ref-context";

type PendingCell = { ref: string; row: number; col: number } | null;

export const FormulaBuilderDialog = () => {
  const [open, setOpen] = useState(false);
  const [cellRef, setCellRef] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<{ cellRef: string }>) => {
      setCellRef(e.detail.cellRef);
      setOpen(true);
    };
    window.addEventListener("open-formula-builder", handler as EventListener);
    return () => {
      window.removeEventListener("open-formula-builder", handler as EventListener);
    };
  }, []);

  const handleApply = (formula: string) => {
    const pending = getPendingCellRef();
    if (pending) {
      const cellInput = document.querySelector<HTMLInputElement>(
        `input[aria-label="Cell ${pending.ref}"]`
      );
      if (cellInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        nativeInputValueSetter?.call(cellInput, formula);
        cellInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    clearPendingCellRef();
    setOpen(false);
    setCellRef(null);
  };

  return (
    <FormulaBuilder
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          clearPendingCellRef();
          setCellRef(null);
        }
        setOpen(o);
      }}
      initialCell={cellRef ?? undefined}
      onApply={handleApply}
    />
  );
};
