"use client";

import { createSeededAvatarScene } from "@/features/sidebar/logo-blobs";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMemo, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

const useIsClientHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

type UserAvatarGlowProps = {
  readonly userId: string;
  readonly label: string;
  readonly className?: string;
  readonly sizeClassName?: string;
};

const initialFromLabel = (label: string): string => {
  const t = label.trim();
  if (!t) return "?";
  const ch = t[0];
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
};

export const UserAvatarGlow = ({
  userId,
  label,
  className,
  sizeClassName = "size-10",
}: UserAvatarGlowProps) => {
  const isClientHydrated = useIsClientHydrated();
  const scene = useMemo(
    () => (isClientHydrated ? createSeededAvatarScene(userId) : null),
    [isClientHydrated, userId],
  );
  const initial = useMemo(() => initialFromLabel(label), [label]);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full ring-2 ring-border/80",
        sizeClassName,
        className,
      )}
      aria-hidden
    >
      {scene ? (
        <div
          className="pointer-events-none absolute inset-0 scale-150"
          style={{ filter: "blur(14px)" }}
        >
          {scene.blobs.map((blob, i) => (
            <div
              key={blob.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${blob.x}%`,
                top: `${blob.y}%`,
                width: `${blob.w}%`,
                height: `${blob.h}%`,
              }}
            >
              <motion.div
                className="size-full rounded-[50%] opacity-[0.88]"
                style={{ background: blob.background }}
                animate={{
                  opacity: [0.8, 0.94, 0.84, 0.8],
                  scale: [1, 1.05, 0.99, 1],
                }}
                transition={{
                  duration: 12 + i * 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-background/15 to-foreground/[0.12] dark:to-black/40" />
      <span className="relative z-10 flex size-full items-center justify-center font-sans text-lg font-semibold tracking-tight text-white drop-shadow-sm">
        {initial}
      </span>
    </div>
  );
};
