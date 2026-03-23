"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemoryShell } from "@/features/memory/MemoryShell";
import { useOpenRouterUi } from "@/features/openrouter/OpenRouterUiProvider";
import { ResearchShell } from "@/features/research/ResearchShell";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Brain, Microscope } from "lucide-react";

export const ChatResearchMemoryDialogs = () => {
  const {
    researchDialogOpen,
    setResearchDialogOpen,
    memoryDialogOpen,
    setMemoryDialogOpen,
  } = useOpenRouterUi();

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
          aria-label="Open Deep Research"
          onClick={() => setResearchDialogOpen(true)}
        >
          <Microscope className="size-4" aria-hidden />
        </button>
      </motion.div>
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
          aria-label="Open Memory"
          onClick={() => setMemoryDialogOpen(true)}
        >
          <Brain className="size-4" aria-hidden />
        </button>
      </motion.div>

      <Dialog open={researchDialogOpen} onOpenChange={setResearchDialogOpen}>
        <DialogContent showClose className="max-h-[min(90vh,720px)] max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-4 py-3 pr-12">
            <DialogTitle>Deep Research</DialogTitle>
            <DialogDescription className="sr-only">
              Research agent and snippets
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[min(78vh,640px)] overflow-y-auto bg-muted p-0">
            <ResearchShell embedded />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={memoryDialogOpen} onOpenChange={setMemoryDialogOpen}>
        <DialogContent showClose className="max-h-[min(90vh,720px)] max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-border px-4 py-3 pr-12">
            <DialogTitle>Memory</DialogTitle>
            <DialogDescription className="sr-only">
              Saved memory entries
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[min(78vh,640px)] overflow-y-auto bg-muted p-0">
            <MemoryShell embedded />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};
