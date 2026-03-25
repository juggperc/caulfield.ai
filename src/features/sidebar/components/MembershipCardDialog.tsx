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
import { useEffect, useCallback } from "react";

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
    gradient: "from-zinc-400 to-zinc-600",
    icon: Zap,
    glow: "bg-zinc-500/20",
    border: "border-zinc-400/50",
    confettiColors: ["#71717A", "#A1A1AA", "#D4D4D8"] as const,
    blobColors: ["zinc-500", "zinc-600", "zinc-400"],
  },
  paid: {
    label: "Pro Member",
    gradient: "from-violet-500 to-purple-600",
    icon: Crown,
    glow: "bg-violet-500/20",
    border: "border-violet-500/50",
    confettiColors: ["#8B5CF6", "#A855F7", "#D946EF"] as const,
    blobColors: ["violet-500", "purple-500", "fuchsia-500"],
  },
  unlimited: {
    label: "Unlimited",
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    icon: Crown,
    glow: "bg-amber-500/20",
    border: "border-amber-400/50",
    confettiColors: ["#FFB800", "#FF5C00", "#FF0055"] as const,
    blobColors: ["amber-500", "orange-500", "rose-500"],
  },
} as const;

const FloatingBlob = ({
  color,
  position,
  delay,
  reduceMotion,
}: {
  color: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  delay: number;
  reduceMotion: boolean;
}) => {
  const positionClasses = {
    "top-left": "-top-20 -left-20",
    "top-right": "-top-20 -right-20",
    "bottom-left": "-bottom-20 -left-20",
    "bottom-right": "-bottom-20 -right-20",
  };

  if (reduceMotion) {
    return (
      <div
        className={`absolute ${positionClasses[position]} w-40 h-40 bg-${color}/30 rounded-full blur-3xl`}
        aria-hidden
      />
    );
  }

  return (
    <motion.div
      className={`absolute ${positionClasses[position]} w-40 h-40 bg-${color}/30 rounded-full blur-3xl`}
      animate={{
        x: [0, 20, 0],
        y: [0, -20, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 8 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      aria-hidden
    />
  );
};

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
      `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.15) 0%, transparent 50%)`
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

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 200, damping: 20 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      x.set((e.clientX - centerX) / rect.width);
      y.set((e.clientY - centerY) / rect.height);

      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [x, y, mouseX, mouseY, prefersReducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  useEffect(() => {
    if (open && !prefersReducedMotion) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: [...config.confettiColors],
          ticks: 200,
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [open, config.confettiColors, prefersReducedMotion]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pointer-events-none border-0 bg-transparent p-0">
        <motion.div
          className="relative mx-auto w-80"
          style={{ perspective: "1000px" }}
          initial={
            prefersReducedMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.8, rotateY: -30 }
          }
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.8, rotateY: 30 }
          }
          transition={{
            duration: prefersReducedMotion ? 0.15 : 0.5,
            ease: "easeOut",
          }}
        >
          <motion.div
            className={`relative overflow-hidden rounded-2xl border-2 ${config.border} bg-gradient-to-br ${config.gradient} p-6 shadow-2xl`}
            style={{
              transformStyle: "preserve-3d",
              rotateX: prefersReducedMotion ? 0 : rotateX,
              rotateY: prefersReducedMotion ? 0 : rotateY,
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl backdrop-blur-sm"
              aria-hidden
            />

            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              {!prefersReducedMotion && (
                <>
                  <FloatingBlob
                    color={config.blobColors[0]}
                    position="top-left"
                    delay={0}
                    reduceMotion={false}
                  />
                  <FloatingBlob
                    color={config.blobColors[1]}
                    position="bottom-right"
                    delay={2}
                    reduceMotion={false}
                  />
                </>
              )}
            </div>

            {!prefersReducedMotion && (
              <SpotlightOverlay mouseX={mouseX} mouseY={mouseY} />
            )}

            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%", y: "-100%" }}
                animate={{ x: "200%", y: "200%" }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 4,
                  ease: "linear",
                }}
                style={{ width: "50%", height: "200%" }}
              />
            </div>

            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-white/80">
                  caulfield.ai
                </span>
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
                  <Icon className="size-3.5 text-white" aria-hidden />
                  <span className="text-xs font-medium text-white">
                    {config.label}
                  </span>
                </div>
              </div>

              <div className="mb-6 flex items-center gap-4">
                <motion.div
                  className="relative"
                  whileHover={
                    prefersReducedMotion ? undefined : { scale: 1.05, rotateY: 5 }
                  }
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="ring-2 ring-white/30">
                    <UserAvatarGlow userId={userId} label={displayName} />
                  </div>
                </motion.div>
                <div>
                  <p className="text-lg font-bold text-white">{displayName}</p>
                  <p className="text-sm text-white/70">{userId.slice(0, 8)}...</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3">
                  <Crown className="size-4 text-white/80" aria-hidden />
                  <div>
                    <p className="text-xs text-white/60">Membership Tier</p>
                    <p className="font-semibold text-white">{config.label}</p>
                  </div>
                </div>

                {joinedAt && (
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 p-3">
                    <Calendar className="size-4 text-white/80" aria-hidden />
                    <div>
                      <p className="text-xs text-white/60">Member Since</p>
                      <p className="font-semibold text-white">{joinedAt}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)",
              }}
              aria-hidden
            />
          </motion.div>
        </motion.div>
      </DialogContent>
   </Dialog>
  );
};