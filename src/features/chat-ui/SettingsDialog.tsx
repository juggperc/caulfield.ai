"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOpenRouterUi } from "@/features/openrouter/OpenRouterUiProvider";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useMemo, useState } from "react";

const SettingsSection = ({
  label,
  children,
}: {
  readonly label?: string;
  readonly children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/15 p-3">
    {label ? (
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    ) : null}
    {children}
  </div>
);

export const SettingsDialog = () => {
  const { openWorkspacePalette, getChatModeShortLabel, selectionEpoch } =
    useOpenRouterUi();
  const [open, setOpen] = useState(false);

  const modeLabel = useMemo(() => {
    void selectionEpoch;
    return getChatModeShortLabel();
  }, [selectionEpoch, getChatModeShortLabel]);

  return (
    <>
      <motion.div
        className="inline-flex"
        whileHover={{ opacity: 0.85 }}
        whileTap={{ scale: 0.97 }}
      >
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "text-muted-foreground",
          )}
          aria-label="Open settings"
          onClick={() => setOpen(true)}
        >
          <Settings className="size-4" aria-hidden />
        </button>
      </motion.div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[min(85vh,480px)] max-w-md gap-0 overflow-hidden p-0 sm:max-w-md"
          showClose
        >
          <DialogHeader className="border-b border-border px-4 pb-3 pt-4 pr-12">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription className="text-[0.8125rem] leading-snug">
              Theme and workspace. Use{" "}
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                ⌘K
              </kbd>{" "}
              /{" "}
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                Ctrl+K
              </kbd>{" "}
              for mode, RAG, and panels.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3 px-4 py-3">
            <SettingsSection label="Appearance">
              <ThemeToggle compact />
            </SettingsSection>
            <SettingsSection label="Workspace">
              <p className="text-[0.8125rem] leading-snug text-muted-foreground">
                Current mode:{" "}
                <span className="font-medium text-foreground">{modeLabel}</span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  openWorkspacePalette();
                }}
              >
                Open workspace palette
              </Button>
            </SettingsSection>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};
