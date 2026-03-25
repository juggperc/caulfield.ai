"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UserAvatarGlow } from "./UserAvatarGlow";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, Zap, Calendar } from "lucide-react";
import { useCallback, useRef, useState } from "react";

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
label: "Free",
icon: Zap,
accentClass: "text-zinc-500",
badgeClass: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
},
paid: {
label: "Pro",
icon: Crown,
accentClass: "text-violet-500",
badgeClass: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
},
unlimited: {
label: "Unlimited",
icon: Crown,
accentClass: "text-amber-500",
badgeClass: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
},
} as const;

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
const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

const handleMouseMove = useCallback(
(e: React.MouseEvent<HTMLDivElement>) => {
if (prefersReducedMotion || !cardRef.current) return;

const rect = cardRef.current.getBoundingClientRect();
const x = (e.clientX - rect.left) / rect.width;
const y = (e.clientY - rect.top) / rect.height;

const rotateY = (x - 0.5) * 12;
const rotateX = (0.5 - y) * 8;

setTilt({ rotateX, rotateY });
},
[prefersReducedMotion]
);

const handleMouseLeave = useCallback(() => {
setTilt({ rotateX: 0, rotateY: 0 });
}, []);

return (
<Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="pointer-events-auto border-0 bg-transparent p-0 shadow-none">
<motion.div
className="relative mx-auto w-80"
initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
transition={{
duration: prefersReducedMotion ? 0.15 : 0.2,
ease: [0.16, 1, 0.3, 1],
}}
style={{ perspective: "800px" }}
>
<motion.div
ref={cardRef}
className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
style={{
rotateX: prefersReducedMotion ? 0 : tilt.rotateX,
rotateY: prefersReducedMotion ? 0 : tilt.rotateY,
transformStyle: "preserve-3d",
}}
onMouseMove={handleMouseMove}
onMouseLeave={handleMouseLeave}
animate={{
rotateX: tilt.rotateX,
rotateY: tilt.rotateY,
}}
transition={{ type: "spring", stiffness: 350, damping: 30 }}
>
<motion.div
 className="pointer-events-none absolute inset-0 rounded-xl"
 style={{
 background:
 "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 50%)",
 }}
 aria-hidden
 />

<div className="relative z-10">
<div className="mb-4 flex items-center justify-between">
<span className="text-xs font-medium text-muted-foreground">
caulfield.ai
</span>
<div
className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium ${config.badgeClass}`}
>
<Icon className="size-3" aria-hidden />
{config.label}
</div>
</div>

<div className="mb-4 flex items-center gap-3">
<div className="ring-1 ring-border rounded-full">
<UserAvatarGlow userId={userId} label={displayName} />
</div>
<div className="min-w-0 flex-1">
<p className="truncate text-base font-semibold">{displayName}</p>
<p className="text-xs text-muted-foreground font-mono">
{userId.slice(0, 8)}
</p>
</div>
</div>

<div className="space-y-2">
<div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
<Icon className={`size-4 ${config.accentClass}`} aria-hidden />
<div className="min-w-0 flex-1">
<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
Membership
</p>
<p className="text-sm font-medium">{config.label}</p>
</div>
</div>

{joinedAt && (
<div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-2">
<Calendar className="size-4 text-muted-foreground" aria-hidden />
<div className="min-w-0 flex-1">
<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
Member Since
</p>
<p className="text-sm font-medium">{joinedAt}</p>
</div>
</div>
)}
</div>
</div>
</motion.div>
</motion.div>
</DialogContent>
</Dialog>
);
};