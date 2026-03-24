"use client";

import { motion } from "framer-motion";
import { Globe, Paperclip, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToolPaletteProps = {
  readonly onClear: () => void;
  readonly onStop: () => void;
  readonly isStreaming: boolean;
  readonly disableClear: boolean;
  readonly onAttachClick: () => void;
  readonly attachDisabled: boolean;
  readonly attachTitle: string;
  readonly webSearchEnabled: boolean;
  readonly onToggleWebSearch: () => void;
};

export const ToolPalette = ({
  onClear,
  onStop,
  isStreaming,
  disableClear,
  onAttachClick,
  attachDisabled,
  attachTitle,
  webSearchEnabled,
  onToggleWebSearch,
}: ToolPaletteProps) => {
  return (
    <div className="flex items-center gap-1 border-t border-border/80 px-2 py-1.5">
      <motion.div whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={
            webSearchEnabled
              ? "text-primary"
              : "text-muted-foreground"
          }
          aria-label={webSearchEnabled ? "Web search on" : "Web search off"}
          aria-pressed={webSearchEnabled}
          title={webSearchEnabled ? "Web search on" : "Web search off"}
          onClick={onToggleWebSearch}
        >
          <motion.span
            animate={{ rotate: webSearchEnabled ? 360 : 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <Globe className="size-3.5" aria-hidden />
          </motion.span>
        </Button>
      </motion.div>

      <motion.div whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          disabled={attachDisabled}
          aria-label={attachTitle}
          title={attachTitle}
          onClick={onAttachClick}
        >
          <Paperclip className="size-3.5" aria-hidden />
        </Button>
      </motion.div>

      <motion.div whileHover={{ opacity: 0.85 }} whileTap={{ scale: 0.97 }}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          disabled={disableClear}
          onClick={onClear}
          aria-label="Clear conversation"
          title="Clear"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </motion.div>

      {isStreaming ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ opacity: 0.9 }}
          whileTap={{ scale: 0.97 }}
        >
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="ml-1 gap-1 border-border"
            onClick={onStop}
            aria-label="Stop generation"
          >
            <Square className="size-2.5 fill-current" aria-hidden />
            Stop
          </Button>
        </motion.div>
      ) : null}
    </div>
  );
};
