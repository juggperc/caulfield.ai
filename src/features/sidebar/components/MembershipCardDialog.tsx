"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserAvatarGlow } from "./UserAvatarGlow";
import { motion } from "framer-motion";
import { Crown, Zap, Calendar } from "lucide-react";

type MembershipCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  displayName: string;
  tier: "free" | "paid" | "unlimited";
  joinedAt?: string;
};

export const MembershipCardDialog = ({
  open,
  onOpenChange,
  userId,
  displayName,
  tier,
  joinedAt,
}: MembershipCardDialogProps) => {
  const tierConfig = {
    free: {
      label: "Free Member",
      gradient: "from-zinc-400 to-zinc-600",
      icon: Zap,
      glow: "bg-zinc-500/20",
      border: "border-zinc-400/50",
    },
    paid: {
      label: "Pro Member",
      gradient: "from-violet-500 to-purple-600",
      icon: Crown,
      glow: "bg-violet-500/20",
      border: "border-violet-500/50",
    },
    unlimited: {
      label: "Unlimited",
      gradient: "from-amber-400 via-orange-500 to-rose-500",
      icon: Crown,
      glow: "bg-amber-500/20",
      border: "border-amber-400/50",
    },
  };

  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pointer-events-none border-0 bg-transparent p-0">
        <motion.div
          className="relative mx-auto w-80 perspective-1000"
          initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotateY: 30 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div
            className={`relative overflow-hidden rounded-2xl border-2 ${config.border} bg-gradient-to-br ${config.gradient} p-6 shadow-2xl`}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: "-100%", y: "-100%" }}
                animate={{ x: "200%", y: "200%" }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
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
                  whileHover={{ scale: 1.05, rotateY: 5 }}
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
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};