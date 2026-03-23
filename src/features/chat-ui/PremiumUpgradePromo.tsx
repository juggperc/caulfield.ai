"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/features/auth/session-context";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  LibraryBig,
  MessageSquare,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "caulfield.premiumPromo.snoozeUntil";
const SNOOZE_MS = 72 * 60 * 60 * 1000;

type QuotaJson = {
  unlimited?: boolean;
  subscribed: boolean;
  paidRemaining?: number;
  freeRemaining?: number;
};

const BENEFITS = [
  {
    title: "100 hosted queries every month",
    body: "Use Grok-class models and full tool routing without burning through a tiny free bucket.",
  },
  {
    title: "Workspace that stays with you",
    body: "Chat, research, memory, notes, docs, sheets, and library — wired for serious work.",
  },
  {
    title: "Simple billing",
    body: "$20/month. Cancel anytime. Quota resets each billing period.",
  },
] as const;

const CAPABILITIES = [
  { icon: MessageSquare, label: "Chat + tools", hint: "Models, research, memory" },
  { icon: BookOpen, label: "Research & docs", hint: "Deep context when you need it" },
  { icon: LibraryBig, label: "Library & files", hint: "Keep outputs organized" },
  { icon: Zap, label: "Connectors", hint: "Marketplace & API keys" },
] as const;

const readSnoozeUntil = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

const writeSnooze = () => {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* ignore */
  }
};

export const PremiumUpgradePromo = () => {
  const { user } = useSession();
  const reduceMotion = useReducedMotion();
  const [quota, setQuota] = useState<QuotaJson | null>(null);
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState(() =>
    typeof window !== "undefined" ? readSnoozeUntil() : 0,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setQuota(null);
      setQuotaLoaded(true);
      return;
    }
    let cancelled = false;
    void fetch("/api/billing/quota", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setQuota(j as QuotaJson);
      })
      .catch(() => {
        if (!cancelled) setQuota(null);
      })
      .finally(() => {
        if (!cancelled) setQuotaLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const snoozed = Date.now() < snoozeUntil;
  /** Unlimited users still see the pill; hide only for paying subs with quota left. */
  const hidePromoForQuota =
    quota?.unlimited !== true &&
    quota?.subscribed === true &&
    (quota.paidRemaining ?? 0) > 0;

  useEffect(() => {
    if (dialogOpen) {
      setTeaserVisible(false);
      return;
    }
    if (!quotaLoaded || hidePromoForQuota || snoozed) {
      setTeaserVisible(false);
      return;
    }
    const t = window.setTimeout(() => setTeaserVisible(true), 1200);
    return () => window.clearTimeout(t);
  }, [dialogOpen, quotaLoaded, hidePromoForQuota, snoozed]);

  const handleSnooze = useCallback(() => {
    writeSnooze();
    setSnoozeUntil(readSnoozeUntil());
    setTeaserVisible(false);
    setDialogOpen(false);
  }, []);

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  if (!quotaLoaded || hidePromoForQuota || snoozed) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {teaserVisible && !dialogOpen ? (
          <motion.div
            role="complementary"
            aria-label="Premium plan"
            initial={
              reduceMotion
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 14, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 10, scale: 0.98 }
            }
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
              "pointer-events-auto fixed z-[25] max-md:left-1/2 max-md:right-auto max-md:-translate-x-1/2",
              "max-md:bottom-[calc(10.25rem+env(safe-area-inset-bottom,0px))]",
              "md:bottom-8 md:right-8 md:left-auto md:translate-x-0",
            )}
          >
            <div className="flex items-center gap-1 rounded-full border border-border bg-card/95 py-1 pl-3 pr-1 shadow-md backdrop-blur-sm dark:bg-card/90">
              <button
                type="button"
                onClick={handleOpenDialog}
                className="flex items-center gap-2 rounded-full py-1.5 text-left text-sm font-medium text-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-haspopup="dialog"
                aria-expanded={dialogOpen}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" aria-hidden />
                </span>
                <span className="pr-1">Premium</span>
              </button>
              <button
                type="button"
                onClick={handleSnooze}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Snooze premium reminders for three days"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[min(88dvh,820px)] max-w-lg gap-0 p-0 sm:max-w-md">
          <PremiumDialogInner onSnooze={handleSnooze} />
        </DialogContent>
      </Dialog>
    </>
  );
};


const PremiumDialogInner = ({ onSnooze }: { readonly onSnooze: () => void }) => {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <DialogHeader className="border-b border-border px-4 pb-3 pr-12 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div>
            <DialogTitle>Caulfield Premium</DialogTitle>
            <DialogDescription className="mt-1">
              More queries, full workspace power, same focused UI.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-6 px-4 py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Why upgrade
          </p>
          <ul className="mt-3 space-y-4">
            {BENEFITS.map((b, i) => (
              <motion.li
                key={b.title}
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.06 + i * 0.07,
                  duration: 0.25,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 dark:bg-muted/20"
              >
                <p className="text-sm font-medium text-foreground">{b.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {b.body}
                </p>
              </motion.li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Included capabilities
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CAPABILITIES.map((c, i) => (
              <motion.div
                key={c.label}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.12 + i * 0.05,
                  duration: 0.22,
                }}
                className="flex gap-2 rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm"
              >
                <c.icon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{c.label}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {c.hint}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Link
            href="/api/billing/checkout"
            className={cn(
              buttonVariants({ size: "default" }),
              "h-11 w-full justify-center text-base font-medium shadow-sm",
            )}
          >
            Subscribe — $20/mo
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onSnooze}
          >
            Remind me later (3 days)
          </Button>
        </div>
      </DialogBody>
    </>
  );
};
