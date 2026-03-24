"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type DocumentSpec = {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly startX: string;
  readonly startY: string;
  readonly midX: string;
  readonly midY: string;
  readonly rotate: number;
  readonly delay: number;
  readonly scale: number;
};

const DOCUMENT_SPECS: readonly DocumentSpec[] = [
  {
    id: "doc-nw",
    width: 110,
    height: 136,
    startX: "-34vw",
    startY: "-21vh",
    midX: "-10vw",
    midY: "-7vh",
    rotate: -18,
    delay: 0,
    scale: 1.08,
  },
  {
    id: "doc-n",
    width: 96,
    height: 122,
    startX: "-8vw",
    startY: "-27vh",
    midX: "-3vw",
    midY: "-9vh",
    rotate: -8,
    delay: 0.03,
    scale: 0.96,
  },
  {
    id: "doc-ne",
    width: 116,
    height: 146,
    startX: "28vw",
    startY: "-19vh",
    midX: "9vw",
    midY: "-6vh",
    rotate: 14,
    delay: 0.06,
    scale: 1.04,
  },
  {
    id: "doc-e",
    width: 102,
    height: 130,
    startX: "37vw",
    startY: "-2vh",
    midX: "11vw",
    midY: "-1vh",
    rotate: 11,
    delay: 0.09,
    scale: 1,
  },
  {
    id: "doc-se",
    width: 100,
    height: 128,
    startX: "24vw",
    startY: "23vh",
    midX: "7vw",
    midY: "7vh",
    rotate: 16,
    delay: 0.12,
    scale: 0.98,
  },
  {
    id: "doc-s",
    width: 108,
    height: 136,
    startX: "-4vw",
    startY: "27vh",
    midX: "-1vw",
    midY: "9vh",
    rotate: 5,
    delay: 0.04,
    scale: 1.06,
  },
  {
    id: "doc-sw",
    width: 118,
    height: 148,
    startX: "-30vw",
    startY: "19vh",
    midX: "-9vw",
    midY: "6vh",
    rotate: -16,
    delay: 0.08,
    scale: 1.02,
  },
  {
    id: "doc-w",
    width: 98,
    height: 126,
    startX: "-39vw",
    startY: "3vh",
    midX: "-12vw",
    midY: "1vh",
    rotate: -10,
    delay: 0.02,
    scale: 0.94,
  },
];

const ACTIVE_DURATION_MS = 1120;
const REDUCED_MOTION_DURATION_MS = 420;
const EXIT_DURATION_MS = 220;

export const GlobalSplashScreen = () => {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const activeDuration = prefersReducedMotion
    ? REDUCED_MOTION_DURATION_MS
    : ACTIVE_DURATION_MS;

  useEffect(() => {
    const hideTimer = window.setTimeout(() => {
      setIsActive(false);
    }, activeDuration);

    const unmountTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, activeDuration + EXIT_DURATION_MS);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [activeDuration]);

  const documentAnimationDuration = prefersReducedMotion ? 0.34 : 0.88;

  if (!isVisible) {
    return null;
  }

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      aria-hidden
      initial={false}
      animate={
        isActive
          ? { opacity: 1 }
          : { opacity: 0, scale: 1.015, filter: "blur(8px)" }
      }
      transition={{
        duration: prefersReducedMotion ? 0.16 : 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="absolute inset-0 bg-background/96 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.92_0.03_250_/_0.4),transparent_38%),radial-gradient(circle_at_center,oklch(0.52_0.13_250_/_0.12),transparent_62%)] dark:bg-[radial-gradient(circle_at_center,oklch(0.58_0.12_250_/_0.34),transparent_36%),radial-gradient(circle_at_center,oklch(0.9_0.02_220_/_0.08),transparent_64%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.18)_48%,transparent_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.06)_48%,rgba(255,255,255,0.02)_100%)]" />

      <div className="absolute inset-0">
        {DOCUMENT_SPECS.map((documentSpec) => (
          <motion.div
            key={documentSpec.id}
            className="absolute left-1/2 top-1/2"
            initial={{ opacity: 0 }}
            animate={
              prefersReducedMotion
                ? {
                    opacity: [0, 0.65, 0],
                    scale: [0.94, 0.9, 0.82],
                  }
                : {
                    opacity: [0, 1, 0.94, 0],
                    x: [documentSpec.startX, documentSpec.midX, "0vw", "0vw"],
                    y: [documentSpec.startY, documentSpec.midY, "0vh", "0vh"],
                    rotate: [
                      documentSpec.rotate,
                      documentSpec.rotate * 0.45,
                      0,
                      0,
                    ],
                    scale: [documentSpec.scale, 1, 0.82, 0.66],
                    filter: [
                      "blur(0px)",
                      "blur(0px)",
                      "blur(0px)",
                      "blur(10px)",
                    ],
                  }
            }
            transition={{
              duration: documentAnimationDuration,
              delay: documentSpec.delay,
              ease: [0.2, 0.84, 0.24, 1],
              times: prefersReducedMotion ? [0, 0.56, 1] : [0, 0.4, 0.78, 1],
            }}
            style={{
              width: documentSpec.width,
              height: documentSpec.height,
            }}
          >
            <div className="relative size-full rounded-[1.6rem] border border-border/70 bg-background/88 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.5)] ring-1 ring-white/45 backdrop-blur-sm dark:border-white/12 dark:bg-white/7 dark:ring-white/12">
              <div className="absolute inset-x-4 top-5 h-3 rounded-full bg-primary/12 dark:bg-white/14" />
              <div className="absolute inset-x-4 top-11 h-2 rounded-full bg-foreground/8 dark:bg-white/9" />
              <div className="absolute inset-x-4 top-[4.25rem] h-2 rounded-full bg-foreground/8 dark:bg-white/9" />
              <div className="absolute inset-x-4 top-[5.75rem] h-2 rounded-full bg-foreground/8 dark:bg-white/9" />
              <div className="absolute inset-x-4 bottom-5 h-12 rounded-2xl bg-[linear-gradient(180deg,transparent_0%,rgba(99,102,241,0.12)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,rgba(196,181,253,0.12)_100%)]" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="absolute size-64 rounded-full bg-[radial-gradient(circle,oklch(0.75_0.13_250_/_0.36)_0%,oklch(0.88_0.03_250_/_0.18)_34%,transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,oklch(0.76_0.11_250_/_0.44)_0%,oklch(0.52_0.12_250_/_0.28)_30%,transparent_70%)]"
          initial={{ opacity: 0.35, scale: 0.72 }}
          animate={
            prefersReducedMotion
              ? { opacity: 0.52, scale: 0.92 }
              : { opacity: [0.24, 0.88, 0.58], scale: [0.7, 1.08, 0.96] }
          }
          transition={{
            duration: prefersReducedMotion ? 0.22 : 0.72,
            delay: prefersReducedMotion ? 0 : 0.2,
            ease: [0.22, 1, 0.36, 1],
            times: prefersReducedMotion ? undefined : [0, 0.55, 1],
          }}
        />

        <motion.div
          className="relative flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={
            prefersReducedMotion
              ? { opacity: 1, scale: 1, y: 0 }
              : {
                  opacity: [0, 0, 1, 1],
                  scale: [0.94, 0.94, 1, 1],
                  y: [10, 10, 0, 0],
                }
          }
          transition={{
            duration: prefersReducedMotion ? 0.18 : 0.8,
            delay: prefersReducedMotion ? 0.05 : 0.08,
            ease: [0.22, 1, 0.36, 1],
            times: prefersReducedMotion ? undefined : [0, 0.46, 0.72, 1],
          }}
        >
          <span className="inline-flex items-center rounded-2xl border border-border/70 bg-background/86 px-5 py-2.5 text-xl font-bold tracking-tight text-foreground shadow-[0_18px_60px_-24px_rgba(99,102,241,0.35)] ring-1 ring-white/55 backdrop-blur-xl dark:border-white/12 dark:bg-black/22 dark:ring-white/12 md:text-2xl">
            caulfield.ai
          </span>
          <motion.span
            className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-muted-foreground/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: prefersReducedMotion ? 0.7 : [0, 0, 0.7] }}
            transition={{
              duration: prefersReducedMotion ? 0.12 : 0.58,
              delay: prefersReducedMotion ? 0.08 : 0.28,
              ease: "easeOut",
              times: prefersReducedMotion ? undefined : [0, 0.64, 1],
            }}
          >
            Workspace loading
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
};
