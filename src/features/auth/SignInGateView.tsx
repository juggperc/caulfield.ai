"use client";

import { Button } from "@/components/ui/button";
import { Logo } from "@/features/sidebar/components/Logo";
import { motion } from "framer-motion";
import {
  FileText,
  Globe,
  LayoutGrid,
  LibraryBig,
  LogIn,
  MessageSquare,
} from "lucide-react";

const FEATURES = [
  { icon: MessageSquare, label: "Chat" },
  { icon: FileText, label: "Notes" },
  { icon: LayoutGrid, label: "Documents" },
  { icon: LibraryBig, label: "Library" },
  { icon: Globe, label: "Web search" },
] as const;

type SignInGateViewProps = {
  readonly onSignIn: () => void;
};

export const SignInGateView = ({ onSignIn }: SignInGateViewProps) => {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-muted/45 dark:bg-muted/30"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-background/60 backdrop-blur-md dark:bg-background/55"
        aria-hidden
      />

      <main className="relative flex flex-1 flex-col items-center justify-center px-5 py-12 md:px-8 md:py-16">
        <motion.div
          className="w-full max-w-md space-y-10 md:space-y-12"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Logo variant="gate" />

          <div className="space-y-8 px-0.5">
            <h1 className="text-center text-[0.9375rem] font-normal leading-relaxed text-muted-foreground">
              Sign in to open your workspace.
            </h1>

            <ul
              className="mx-auto max-w-xs space-y-3.5"
              aria-label="Workspace areas"
            >
              {FEATURES.map(({ icon: Icon, label }, i) => (
                <motion.li
                  key={label}
                  className="flex items-center gap-3 text-[0.9375rem] text-foreground"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.22,
                    delay: 0.06 + i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span>{label}</span>
                </motion.li>
              ))}
            </ul>

            <div className="flex justify-center pt-2">
              <Button
                type="button"
                size="lg"
                className="gap-2 px-8"
                onClick={onSignIn}
              >
                <LogIn className="size-4" aria-hidden />
                Sign in
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
