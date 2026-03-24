"use client";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { BookOpen, Brain, Microscope } from "lucide-react";

export const ChatResearchMemoryDialogs = () => {
  const {
    knowledgeOpen,
    setKnowledgeOpen,
    knowledgeTab,
    setKnowledgeTab,
    openKnowledgeSnippets,
    openKnowledgeMemory,
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
          aria-label="Open research snippets library"
          onClick={openKnowledgeSnippets}
        >
          <BookOpen className="size-4" aria-hidden />
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
          aria-label="Open memory"
          onClick={openKnowledgeMemory}
        >
          <Brain className="size-4" aria-hidden />
        </button>
      </motion.div>

      <Dialog open={knowledgeOpen} onOpenChange={setKnowledgeOpen}>
        <DialogContent
          showClose
          className="max-h-[min(90vh,720px)] max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          <DialogHeader className="border-b border-border px-4 py-3 pr-12">
            <DialogTitle>Knowledge</DialogTitle>
            <DialogDescription className="sr-only">
              Research snippets and saved memory
            </DialogDescription>
          </DialogHeader>
          <div
            className="flex shrink-0 gap-1 border-b border-border px-3 py-2"
            role="tablist"
            aria-label="Knowledge sections"
          >
            <Button
              type="button"
              variant={knowledgeTab === "snippets" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              role="tab"
              aria-selected={knowledgeTab === "snippets"}
              onClick={() => setKnowledgeTab("snippets")}
            >
              <Microscope className="size-3.5" aria-hidden />
              Research
            </Button>
            <Button
              type="button"
              variant={knowledgeTab === "memory" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              role="tab"
              aria-selected={knowledgeTab === "memory"}
              onClick={() => setKnowledgeTab("memory")}
            >
              <Brain className="size-3.5" aria-hidden />
              Memory
            </Button>
          </div>
          <DialogBody className="max-h-[min(78vh,640px)] overflow-y-auto bg-muted p-0">
            {knowledgeTab === "snippets" ? (
              <ResearchShell embedded />
            ) : (
              <MemoryShell embedded />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};
