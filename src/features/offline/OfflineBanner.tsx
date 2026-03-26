"use client";

import { useOffline } from "@/features/offline/offline-context";
import { CloudOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const OfflineBanner = () => {
const { isOffline } = useOffline();

return (
<AnimatePresence>
{isOffline ? (
 <motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: "auto", opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
  className="shrink-0 overflow-hidden"
 >
  <div className="flex items-center justify-center gap-2 border-b border-border/80 bg-muted/80 px-3 py-2 text-sm text-muted-foreground backdrop-blur-sm">
   <CloudOff className="size-4 shrink-0 opacity-70" aria-hidden />
   <span>You&apos;re offline. Some features may not be available.</span>
  </div>
 </motion.div>
) : null}
</AnimatePresence>
);
};