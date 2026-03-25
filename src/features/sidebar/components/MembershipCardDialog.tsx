"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserAvatarGlow } from "./UserAvatarGlow";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { Crown, Zap, Calendar } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect, useCallback, useRef } from "react";

type MembershipCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  displayName: string;
  tier: "free" | "paid" | "unlimited";
  joinedAt?: string;
};

const tierConfigs = {
  free: {
    label: "Free Member",
    gradientClass: "bg-gradient-to-br from-zinc-500 via-zinc-600 to-zinc-700",
    icon: Zap,
    border: "border-zinc-400/40",
    confettiColors: ["#71717A", "#A1A1AA", "#D4D4D8"] as const,
    blob1Class: "bg-zinc-400/40",
    blob2Class: "bg-zinc-500/30",
  },
  paid: {
    label: "Pro Member",
    gradientClass: "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600",
    icon: Crown,
    border: "border-violet-400/40",
    confettiColors: ["#8B5CF6", "#A855F7", "#D946EF"] as const,
    blob1Class: "bg-violet-400/40",
    blob2Class: "bg-purple-500/30",
  },
  unlimited: {
    label: "Unlimited",
    gradientClass: "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500",
    icon: Crown,
    border: "border-amber-400/40",
    confettiColors: ["#FFB800", "#FF5C00", "#FF0055"] as const,
    blob1Class: "bg-amber-400/40",
    blob2Class: "bg-orange-500/30",
  },
} as const;

const SpotlightOverlay = ({
  mouseX,
  mouseY,
}: {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) => {
  const background = useTransform(
    [mouseX, mouseY],
    ([x, y]) =>
      `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 25%, transparent 50%)`
  );

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 rounded-2xl"
      style={{ background }}
      aria-hidden
    />
  );
};

export const MembershipCardDialog = ({
  open,
  onOpenChange,
  userId,
  displayName,
  tier,
  joinedAt,
}: MembershipCardDialogProps) => {
  const config = tierConfigs[tier];
  const Icon = config.icon;
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);

  const springConfig = { stiffness: 300, damping: 30 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(springY, [0, 1], [15, -15]);
  const rotateY = useTransform(springX, [0, 1], [-15, 15]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      mouseX.set(x);
      mouseY.set(y);
      spotlightX.set(e.clientX - rect.left);
      spotlightY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY, spotlightX, spotlightY, prefersReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (open && !prefersReducedMotion) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: [...config.confettiColors],
          ticks: 150,
          gravity: 0.8,
          scalar: 1.2,
        });
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [open, config.confettiColors, prefersReducedMotion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pointer-events-none border-0 bg-transparent p-0 shadow-none">
        <motion.div
          className="relative mx-auto w-80"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
          transition={{
            duration: prefersReducedMotion ? 0.15 : 0.4,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ perspective: "1200px" }}
        >
          <motion.div
            ref={cardRef}
            className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.gradientClass} p-6 shadow-2xl`}
            style={{
              transformStyle: "preserve-3d",
              rotateX: prefersReducedMotion ? 0 : rotateX,
              rotateY: prefersReducedMotion ? 0 : rotateY,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Floating gradient blobs */}
            {!prefersReducedMotion && (
              <>
                <motion.div
                  className={`pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full ${config.blob1Class} blur-3xl`}
                  animate={{
                    x: [0, 30, 0],
                    y: [0, -20, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  aria-hidden
                />
                <motion.div
                  className={`pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full ${config.blob2Class} blur-3xl`}
                  animate={{
                    x: [0, -30, 0],
                    y: [0, 20, 0],
                    scale: [1, 1.15, 1],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  aria-hidden
                />
              </>
            )}

            {/* Spotlight that follows cursor */}
            {!prefersReducedMotion && (
              <SpotlightOverlay mouseX={spotlightX} mouseY={spotlightY} />
            )}

            {/* Horizontal shine sweep */}
            {!prefersReducedMotion && (
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  initial={{ x: "-100%", y: "-100%" }}
                  animate={{ x: "200%", y: "200%" }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 5,
                    ease: "easeInOut",
                  }}
                  style={{ width: "40%", height: "200%" }}
                />
              </div>
            )}

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-white/60">
                  caulfield.ai
                </span>
                <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                  <Icon className="size-3.5 text-white" aria-hidden />
                  <span className="text-xs font-semibold text-white">
                    {config.label}
                  </span>
                </div>
              </div>

              {/* Avatar and name */}
              <div className="mb-6 flex items-center gap-4">
                <motion.div
                  className="relative"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <div className="ring-2 ring-white/20 rounded-full">
                    <UserAvatarGlow userId={userId} label={displayName} />
                  </div>
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-white">{displayName}</p>
                  <p className="text-sm text-white/50 font-mono">{userId.slice(0, 8)}</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                  <Crown className="size-4 text-white/70" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-white/50">
                      Membership
                    </p>
                    <p className="font-semibold text-white">{config.label}</p>
                  </div>
                </div>

                {joinedAt && (
                  <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                    <Calendar className="size-4 text-white/70" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        Member Since
                      </p>
                      <p className="font-semibold text-white">{joinedAt}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top-left highlight */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)",
              }}
              aria-hidden
            />
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};