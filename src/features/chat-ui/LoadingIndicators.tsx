"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { memo } from "react";

export const ThinkingIndicator = memo(() => (
  <div className="flex items-center gap-3 px-4 py-3">
    <motion.div
      className="flex items-center gap-1.5"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <Sparkles className="size-4 text-primary/70" aria-hidden />
    </motion.div>
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-primary/60"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
    <span className="text-sm text-muted-foreground">Thinking</span>
  </div>
));
ThinkingIndicator.displayName = "ThinkingIndicator";

export const ImageGeneratingIndicator = memo(
  ({ prompt }: { readonly prompt?: string }) => (
    <div className="my-2 flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="size-5 text-primary" aria-hidden />
        </motion.div>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">
            Generating image
          </span>
          <motion.div
            className="flex gap-1"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="text-xs text-muted-foreground"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              >
                .
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
      {prompt && (
        <motion.div
          className="h-32 w-full max-w-sm overflow-hidden rounded-md border border-border/50 bg-muted/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="h-full w-full bg-gradient-to-r from-muted via-muted/50 to-muted"
            animate={{
              backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      )}
    </div>
  ),
);
ImageGeneratingIndicator.displayName = "ImageGeneratingIndicator";

export const FinishedIndicator = memo(
  ({ label }: { readonly label?: string }) => (
    <motion.div
      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Check className="size-3.5" aria-hidden />
      </motion.div>
      <span>{label ?? "Done"}</span>
    </motion.div>
  ),
);
FinishedIndicator.displayName = "FinishedIndicator";

export const StreamingCursor = memo(() => (
  <motion.span
    className="inline-block w-0.5 bg-primary"
    style={{ height: "1em", marginLeft: "1px" }}
    animate={{ opacity: [1, 0, 1] }}
    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    aria-hidden
  />
));
StreamingCursor.displayName = "StreamingCursor";