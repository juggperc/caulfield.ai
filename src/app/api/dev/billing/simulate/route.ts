import { auth } from "@/auth";
import {
  FREE_QUERY_LIMIT,
  PAID_QUERY_LIMIT_PER_PERIOD,
} from "@/lib/billing/quota";
import { upsertPolarBillingRow } from "@/lib/billing/polar-webhook-sync";
import {
  devToolsNotFound,
  isDevBillingToolsEnabled,
} from "@/lib/dev/dev-billing-tools";
import { db } from "@/lib/db";
import { billingSubscription, userUsage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type SimulateAction =
  | "grant_paid_subscriber"
  | "cancel_subscription"
  | "reset_usage"
  | "exhaust_free"
  | "exhaust_paid"
  | "expire_billing_period";

const ensureUsageRow = async (userId: string) => {
  if (!db) return;
  await db
    .insert(userUsage)
    .values({ userId, freeQueriesUsed: 0, paidQueriesUsed: 0 })
    .onConflictDoNothing({ target: userUsage.userId });
};

export const POST = async (req: Request) => {
  if (!isDevBillingToolsEnabled()) {
    return devToolsNotFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set; billing simulation needs Postgres." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = (body as { action?: string })?.action as SimulateAction | undefined;
  const valid: SimulateAction[] = [
    "grant_paid_subscriber",
    "cancel_subscription",
    "reset_usage",
    "exhaust_free",
    "exhaust_paid",
    "expire_billing_period",
  ];
  if (!action || !valid.includes(action)) {
    return NextResponse.json(
      { error: "Unknown action", valid },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  await ensureUsageRow(userId);

  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);

  if (action === "grant_paid_subscriber") {
    await upsertPolarBillingRow({
      userId,
      polarCustomerId: "dev_cus_mock",
      polarSubscriptionId: `dev_sub_${userId.slice(0, 8)}`,
      status: "active",
      currentPeriodEnd: periodEnd,
    });
    await db
      .update(userUsage)
      .set({ freeQueriesUsed: 0, paidQueriesUsed: 0, updatedAt: new Date() })
      .where(eq(userUsage.userId, userId));
  }

  if (action === "cancel_subscription") {
    await upsertPolarBillingRow({
      userId,
      polarCustomerId: "dev_cus_mock",
      polarSubscriptionId: null,
      status: "inactive",
      currentPeriodEnd: null,
    });
  }

  if (action === "reset_usage") {
    await db
      .update(userUsage)
      .set({ freeQueriesUsed: 0, paidQueriesUsed: 0, updatedAt: new Date() })
      .where(eq(userUsage.userId, userId));
  }

  if (action === "exhaust_free") {
    await db
      .update(userUsage)
      .set({
        freeQueriesUsed: FREE_QUERY_LIMIT,
        updatedAt: new Date(),
      })
      .where(eq(userUsage.userId, userId));
  }

  if (action === "exhaust_paid") {
    await db
      .update(userUsage)
      .set({
        paidQueriesUsed: PAID_QUERY_LIMIT_PER_PERIOD,
        updatedAt: new Date(),
      })
      .where(eq(userUsage.userId, userId));
  }

  if (action === "expire_billing_period") {
    const yesterday = new Date(Date.now() - 86_400_000);
    await db
      .update(billingSubscription)
      .set({
        currentPeriodEnd: yesterday,
        updatedAt: new Date(),
      })
      .where(eq(billingSubscription.userId, userId));
  }

  return NextResponse.json({ ok: true, action });
};
