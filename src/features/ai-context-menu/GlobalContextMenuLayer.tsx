"use client";

import { cn } from "@/lib/utils";
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

const MENU_W = 280;
const MENU_PAD = 8;

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

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onDocContextMenu = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      const workspace = document.querySelector("[data-ai-workspace]");
      if (!workspace || !workspace.contains(t)) return;
      if (shouldUseNativeContextMenu(t)) return;

      e.preventDefault();
      e.stopPropagation();
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
      setOpen(true);
    };

    document.addEventListener("contextmenu", onDocContextMenu, true);
    return () => document.removeEventListener("contextmenu", onDocContextMenu, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
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
  }, [open, closeMenu]);

  useLayoutEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const actions = buildAiContextActions({
    panel,
    selectionText: selectionAtOpen,
    onPanelChange,
    closeMenu,
  });
  const cone = coneActionsFrom(actions);
  const coneIds = new Set(cone.map((c) => c.id));
  const menuListActions = actions.filter((a) => !coneIds.has(a.id));

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="AI actions"
      className="fixed z-[100] w-[min(280px,calc(100vw-16px))] rounded-lg border border-border bg-popover py-1.5 text-popover-foreground shadow-lg outline-none"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="border-b border-border px-2 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          AI actions
        </p>
        {cone.length > 0 ? (
          <div
            className="mt-2 flex flex-wrap gap-1.5 motion-safe:pt-0.5"
            role="group"
            aria-label="Suggested actions"
          >
            {cone.map((a, i) => (
              <button
                key={a.id}
                ref={i === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                onClick={() => a.run()}
                className={cn(
                  "rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "motion-safe:origin-bottom motion-safe:-translate-y-px motion-safe:transition-transform",
                )}
                style={
                  !reduceMotion
                    ? {
                        transform: `rotate(${-8 + i * 5.5}deg) translateY(${-i * 2}px)`,
                      }
                    : undefined
                }
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="max-h-[min(320px,50vh)] overflow-y-auto py-1">
        {menuListActions.map((a, i) => (
          <button
            key={a.id}
            ref={cone.length === 0 && i === 0 ? firstItemRef : undefined}
            type="button"
            role="menuitem"
            onClick={() => a.run()}
            className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(menu, document.body);
};
