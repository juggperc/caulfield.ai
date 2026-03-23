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
import { ResearchShell } from "@/features/research/ResearchShell";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Brain, Microscope } from "lucide-react";
import { useState } from "react";

export const ChatResearchMemoryDialogs = () => {
  const [researchOpen, setResearchOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

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
          onClick={() => setResearchOpen(true)}
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
          onClick={() => setMemoryOpen(true)}
        >
          <Brain className="size-4" aria-hidden />
        </button>
      </motion.div>

      <Dialog open={researchOpen} onOpenChange={setResearchOpen}>
        <DialogContent showClose>
          <DialogHeader>
            <DialogTitle>Deep Research</DialogTitle>
            <DialogDescription className="sr-only">
              Run multi-step research and manage saved snippets for chat RAG.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="bg-muted">
            <ResearchShell embedded />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={memoryOpen} onOpenChange={setMemoryOpen}>
        <DialogContent showClose>
          <DialogHeader>
            <DialogTitle>Memory</DialogTitle>
            <DialogDescription className="sr-only">
              View and edit durable memory entries used by the chat agent.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="bg-muted">
            <MemoryShell embedded />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
};
