"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMemo, useSyncExternalStore } from "react";

type BlobSpec = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  background: string;
};

type LogoScene = {
  blobs: BlobSpec[];
  grainSeed: number;
};

const createLogoScene = (): LogoScene => {
  const blobCount = 5 + Math.floor(Math.random() * 5);
  const blobs: BlobSpec[] = [];

  for (let i = 0; i < blobCount; i++) {
    const L = 0.12 + Math.random() * 0.78;
    const C = 0.03 + Math.random() * 0.22;
    const H = Math.random() * 360;
    blobs.push({
      id: `blob-${i}-${Math.random().toString(36).slice(2, 9)}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      w: 42 + Math.random() * 95,
      h: 42 + Math.random() * 95,
      background: `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`,
    });
  }

  return {
    blobs,
    grainSeed: Math.random() * 1000,
  };
};

const emptySubscribe = () => () => {};

/**
 * false during SSR and the browser's hydration pass (matches server HTML).
 * true immediately after the client has hydrated — safe for Math.random().
 */
const useIsClientHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

type LogoProps = {
  /** `auth`: sign-in card header with gradient blend into `bg-card` below */
  readonly variant?: "sidebar" | "auth";
};

export const Logo = ({ variant = "sidebar" }: LogoProps) => {
  const isClientHydrated = useIsClientHydrated();
  const isAuth = variant === "auth";

  const scene = useMemo(
    () => (isClientHydrated ? createLogoScene() : null),
    [isClientHydrated],
  );

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden bg-muted dark:bg-background",
        isAuth
          ? "h-40 rounded-t-xl border-0"
          : "h-28 border-b border-border",
      )}
    >
      {scene ? (
        <>
          <div
            className={cn(
              "pointer-events-none absolute inset-0 scale-[1.35]",
              isAuth &&
                "[mask-image:linear-gradient(to_bottom,black_0%,black_42%,rgba(0,0,0,0.65)_68%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_42%,rgba(0,0,0,0.65)_68%,transparent_100%)]",
            )}
            style={{ filter: isAuth ? "blur(42px)" : "blur(36px)" }}
            aria-hidden
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
                  className="size-full rounded-[50%] opacity-[0.92]"
                  style={{ background: blob.background }}
                  initial={{ opacity: 0.75 }}
                  animate={{
                    opacity: [0.78, 0.95, 0.82, 0.78],
                    x: ["-2%", "3%", "-1%", "0%"],
                    y: ["1%", "-2%", "1.5%", "0%"],
                    scale: [1, 1.06, 0.98, 1.03, 1],
                  }}
                  transition={{
                    duration: 18 + i * 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            ))}
          </div>

          <motion.div
            className={cn(
              "pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.14]",
              isAuth &&
                "[mask-image:linear-gradient(to_bottom,black_0%,black_48%,transparent_92%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_48%,transparent_92%)]",
            )}
            aria-hidden
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch' seed='${Math.floor(scene.grainSeed)}'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
            animate={{ opacity: [0.12, 0.17, 0.13] }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {isAuth ? (
            <>
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 via-transparent via-45% to-transparent dark:from-background/30"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-[48%] via-card/55 via-[72%] to-card dark:via-card/70"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-card/95 dark:to-card"
                aria-hidden
              />
              <motion.div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent_0%,black_35%,black_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_35%,black_100%)]"
                aria-hidden
                animate={{ opacity: [0.35, 0.55, 0.4] }}
                transition={{
                  duration: 14,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-background/25 to-foreground/[0.06] dark:from-background/40 dark:to-black/45" />
          )}
        </>
      ) : null}

      <div
        className={cn(
          "absolute inset-0 flex p-3",
          isAuth
            ? "items-center justify-center"
            : "flex-col justify-between",
        )}
      >
        <span
          className={cn(
            "inline-flex w-fit rounded-md border border-border/70 bg-background/88 font-sans font-bold tracking-tight text-foreground shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/72",
            isAuth
              ? "px-3 py-1.5 text-xl"
              : "px-2.5 py-1 text-lg",
          )}
        >
          caulfield.ai
        </span>
      </div>
    </div>
  );
};
