"use client";

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

export const Logo = () => {
  const isClientHydrated = useIsClientHydrated();

  const scene = useMemo(
    () => (isClientHydrated ? createLogoScene() : null),
    [isClientHydrated],
  );

  return (
    <div className="relative h-28 w-full shrink-0 overflow-hidden border-b border-border bg-muted dark:bg-background">
      {scene ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 scale-[1.35]"
            style={{ filter: "blur(36px)" }}
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
            className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
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

          <div className="absolute inset-0 bg-gradient-to-b from-background/25 to-foreground/[0.06] dark:from-background/40 dark:to-black/45" />
        </>
      ) : null}

      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <span className="inline-flex w-fit rounded-md border border-border/70 bg-background/88 px-2.5 py-1 font-sans text-lg font-bold tracking-tight text-foreground shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/72">
          caulfield.ai
        </span>
      </div>
    </div>
  );
};
