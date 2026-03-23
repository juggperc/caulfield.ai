import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  billingSubscription,
  userUsage,
} from "@/lib/db/schema";

export const FREE_QUERY_LIMIT = 5;
export const PAID_QUERY_LIMIT_PER_PERIOD = 100;

export type QuotaCheck =
  | { ok: true }
  | {
      ok: false;
      reason: "no_credits";
      message: string;
      freeRemaining: number;
      paidRemaining: number;
    };

const ensureUsageRow = async (userId: string) => {
  if (!db) return;
  await db
    .insert(userUsage)
    .values({ userId, freeQueriesUsed: 0, paidQueriesUsed: 0 })
    .onConflictDoNothing({ target: userUsage.userId });
};

const resetPaidIfPeriodExpired = async (
  userId: string,
  sub: typeof billingSubscription.$inferSelect | undefined,
  usage: typeof userUsage.$inferSelect,
) => {
  if (!db || !sub?.currentPeriodEnd) return usage;
  const end = sub.currentPeriodEnd.getTime();
  if (Date.now() > end && sub.status === "active") {
    await db
      .update(userUsage)
      .set({ paidQueriesUsed: 0, updatedAt: new Date() })
      .where(eq(userUsage.userId, userId));
    return { ...usage, paidQueriesUsed: 0 };
  }
  return usage;
};

export type QuotaOptions = {
  /** When false (Free chat mode), skip limits and do not consume app quota. */
  readonly billable?: boolean;
};

export const checkChatQuota = async (
  userId: string,
  options?: QuotaOptions,
): Promise<QuotaCheck> => {
  if (options?.billable === false) return { ok: true };
  if (!db) return { ok: true };

  await ensureUsageRow(userId);

  const [usageRow] = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1);

  const [subRow] = await db
    .select()
    .from(billingSubscription)
    .where(eq(billingSubscription.userId, userId))
    .limit(1);

  const usage = usageRow ?? {
    userId,
    freeQueriesUsed: 0,
    paidQueriesUsed: 0,
    updatedAt: new Date(),
  };

  const adjusted = await resetPaidIfPeriodExpired(userId, subRow, usage);

  const subscribed =
    subRow?.status === "active" &&
    subRow.currentPeriodEnd &&
    subRow.currentPeriodEnd.getTime() > Date.now();

  const freeRemaining = Math.max(0, FREE_QUERY_LIMIT - adjusted.freeQueriesUsed);
  const paidRemaining = subscribed
    ? Math.max(0, PAID_QUERY_LIMIT_PER_PERIOD - adjusted.paidQueriesUsed)
    : 0;

  if (subscribed) {
    if (paidRemaining <= 0) {
      console.warn(
        "[quota] Denied — paid limit reached",
        JSON.stringify({ subscribed: true, paidRemaining: 0 }),
      );
      return {
        ok: false,
        reason: "no_credits",
        message:
          "Monthly query limit reached. Renew or wait for the next billing period.",
        freeRemaining,
        paidRemaining: 0,
      };
    }
    return { ok: true };
  }

  if (freeRemaining <= 0) {
    console.warn(
      "[quota] Denied — free limit reached",
      JSON.stringify({ subscribed: false, freeRemaining: 0 }),
    );
    return {
      ok: false,
      reason: "no_credits",
      message:
        "Free queries used. Subscribe ($20/mo for 100 queries) to continue.",
      freeRemaining: 0,
      paidRemaining: 0,
    };
  }

  return { ok: true };
};

export const consumeChatQuery = async (
  userId: string,
  options?: QuotaOptions,
): Promise<void> => {
  if (options?.billable === false) return;
  if (!db) return;

  await ensureUsageRow(userId);

  const [usageRow] = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1);

  const [subRow] = await db
    .select()
    .from(billingSubscription)
    .where(eq(billingSubscription.userId, userId))
    .limit(1);

  const subscribed =
    subRow?.status === "active" &&
    subRow.currentPeriodEnd &&
    subRow.currentPeriodEnd.getTime() > Date.now();

  const free = usageRow?.freeQueriesUsed ?? 0;
  const paid = usageRow?.paidQueriesUsed ?? 0;

  if (subscribed) {
    await db
      .update(userUsage)
      .set({
        paidQueriesUsed: paid + 1,
        updatedAt: new Date(),
      })
      .where(eq(userUsage.userId, userId));
    return;
  }

  await db
    .update(userUsage)
    .set({
      freeQueriesUsed: free + 1,
      updatedAt: new Date(),
    })
    .where(eq(userUsage.userId, userId));
};

export const getQuotaSnapshot = async (userId: string) => {
  if (!db) {
    return {
      freeRemaining: FREE_QUERY_LIMIT,
      paidRemaining: 0,
      subscribed: false,
    };
  }
  await ensureUsageRow(userId);
  const [usageRow] = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1);
  const [subRow] = await db
    .select()
    .from(billingSubscription)
    .where(eq(billingSubscription.userId, userId))
    .limit(1);

  const usage = usageRow ?? {
    userId,
    freeQueriesUsed: 0,
    paidQueriesUsed: 0,
    updatedAt: new Date(),
  };
  const sub = subRow;
  const adjusted = await resetPaidIfPeriodExpired(userId, sub, usage);

  const subscribed =
    sub?.status === "active" &&
    sub.currentPeriodEnd &&
    sub.currentPeriodEnd.getTime() > Date.now();

  return {
    freeRemaining: Math.max(0, FREE_QUERY_LIMIT - adjusted.freeQueriesUsed),
    paidRemaining: subscribed
      ? Math.max(0, PAID_QUERY_LIMIT_PER_PERIOD - adjusted.paidQueriesUsed)
      : 0,
    subscribed,
  };
};
