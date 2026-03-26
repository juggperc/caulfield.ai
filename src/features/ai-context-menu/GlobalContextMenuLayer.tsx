"use client";

import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Copy,
  FileEdit,
  FileText,
  Globe,
  Languages,
  Lightbulb,
  List,
  MessageSquare,
  Pencil,
  Quote,
  Sparkles,
  Calculator,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { buildAiContextActions, coneActionsFrom } from "./build-ai-context-actions";
import { useAiWorkspace } from "./ai-workspace-context";
import { setPendingCellRef, getCellRef } from "@/features/documents/cell-ref-context";

const MENU_W = 280;
const MENU_PAD = 8;

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  copy: Copy,
  message: MessageSquare,
  list: List,
  pencil: Pencil,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  languages: Languages,
  globe: Globe,
  "arrow-right": ArrowRight,
  quote: Quote,
  "file-edit": FileEdit,
  "file-text": FileText,
  calculator: Calculator,
};

const shouldUseNativeContextMenu = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-native-menu]")) return true;
  if (target.closest("input, textarea, select")) return true;
  if (target.closest("[contenteditable='true']")) return true;
  return false;
};

export const GlobalContextMenuLayer = () => {
  const { panel, onPanelChange } = useAiWorkspace();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [selectionAtOpen, setSelectionAtOpen] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [cellRef, setCellRef] = useState<string | null>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onDocContextMenu = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      const workspace = document.querySelector("[data-ai-workspace]");
      if (!workspace || !workspace.contains(t)) return;

      const cellInput = (t as Element).closest("input[aria-label*='Cell']");
      let detectedCellRef: string | null = null;
      if (cellInput && cellInput instanceof HTMLInputElement) {
        const match = cellInput.getAttribute("aria-label")?.match(/Cell ([A-Z]+\d+)/i);
        if (match?.[1]) {
          detectedCellRef = match[1];
        }
      }

      const shouldBlockNative = shouldUseNativeContextMenu(t);
      if (shouldBlockNative && !detectedCellRef) return;

      e.preventDefault();
      e.stopPropagation();

      setCellRef(detectedCellRef);

      const sel = window.getSelection()?.toString() ?? "";
      setSelectionAtOpen(sel);
      let x = e.clientX;
      let y = e.clientY;
      if (typeof window !== "undefined") {
        x = Math.min(x, window.innerWidth - MENU_W - MENU_PAD);
        y = Math.min(y, window.innerHeight - MENU_PAD);
        x = Math.max(MENU_PAD, x);
        y = Math.max(MENU_PAD, y);
      }
      setPos({ x, y });
      setReduceMotion(
        typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      setFocusedIndex(0);
      setOpen(true);
    };

    document.addEventListener("contextmenu", onDocContextMenu, true);
    return () => document.removeEventListener("contextmenu", onDocContextMenu, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const actions = buildAiContextActions({
          panel,
          selectionText: selectionAtOpen,
          onPanelChange,
          closeMenu,
        });
        const nonSeparatorActions = actions.filter((a) => !a.separator);
        if (nonSeparatorActions.length === 0) return;
        setFocusedIndex((prev) => {
          if (e.key === "ArrowDown") {
            return (prev + 1) % nonSeparatorActions.length;
          }
          return (prev - 1 + nonSeparatorActions.length) % nonSeparatorActions.length;
        });
      }
    };
    const onPointer = (e: MouseEvent) => {
      const m = menuRef.current;
      if (m && e.target instanceof Node && m.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, closeMenu, panel, selectionAtOpen, onPanelChange, cellRef]);

  useLayoutEffect(() => {
    if (!open) return;
    const buttons = menuRef.current?.querySelectorAll("button[role='menuitem']");
    if (buttons && buttons[focusedIndex]) {
      (buttons[focusedIndex] as HTMLButtonElement).focus();
    }
  }, [open, focusedIndex]);

  if (!open) return null;

  const actions = buildAiContextActions({
    panel,
    selectionText: selectionAtOpen,
    onPanelChange,
    closeMenu,
  });

  if (cellRef) {
    const formulaAction = {
      id: "build-formula",
      label: `Build formula for ${cellRef}`,
      icon: "calculator" as const,
      run: () => {
        setPendingCellRef({ ref: cellRef, row: 0, col: 0 });
        window.dispatchEvent(new CustomEvent("open-formula-builder", { detail: { cellRef } }));
        closeMenu();
      },
    };
    const insertIdx = actions.findIndex((a) => a.id === "ask-chat");
    if (insertIdx >= 0) {
      actions.splice(insertIdx, 0, formulaAction);
    } else {
      actions.unshift(formulaAction);
    }
  }

  const cone = coneActionsFrom(actions);
  const coneIds = new Set(cone.map((c) => c.id));

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="AI actions"
      className="fixed z-[100] w-[min(280px,calc(100vw-16px))] rounded-xl border border-border/80 bg-popover/95 backdrop-blur-sm py-1.5 text-popover-foreground shadow-xl outline-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {cone.length > 0 && (
        <div className="px-2 pb-2 mb-1.5 border-b border-border/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Suggested
          </p>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Suggested actions"
          >
            {cone.map((a, i) => {
              const Icon = a.icon ? iconMap[a.icon] : undefined;
              return (
                <button
                  key={a.id}
                  ref={i === 0 ? firstItemRef : undefined}
                  type="button"
                  role="menuitem"
                  onClick={() => a.run()}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-all",
                    "hover:bg-muted hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    !reduceMotion && "motion-safe:transition-transform",
                  )}
                  style={
                    !reduceMotion
                      ? {
                          transform: `rotate(${-4 + i * 3}deg)`,
                        }
                      : undefined
                  }
                >
                  {Icon && <Icon className="size-3 opacity-70" aria-hidden />}
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-h-[min(320px,50vh)] overflow-y-auto py-0.5">
        {actions.map((a, i) => {
          if (a.separator) {
            return (
              <div
                key={a.id}
                className="my-1.5 h-px bg-border/60 mx-2"
                role="separator"
              />
            );
          }
          if (coneIds.has(a.id)) return null;

          const Icon = a.icon ? iconMap[a.icon] : undefined;
          return (
            <button
              key={a.id}
              ref={cone.length === 0 && i === 0 ? firstItemRef : undefined}
              type="button"
              role="menuitem"
              onClick={() => a.run()}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/80 focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {Icon && <Icon className="size-4 shrink-0 opacity-60" aria-hidden />}
              <span>{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(menu, document.body);
};
