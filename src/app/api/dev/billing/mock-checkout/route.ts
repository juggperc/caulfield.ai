import { auth } from "@/auth";
import { upsertPolarBillingRow } from "@/lib/billing/polar-webhook-sync";
import {
  devToolsNotFound,
  isDevBillingToolsEnabled,
} from "@/lib/dev/dev-billing-tools";
import { db } from "@/lib/db";
import { userUsage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Development-only stand-in for Polar checkout: grants an active mock subscription
 * and resets paid usage for the current period, then redirects home.
 */
export const GET = async (req: Request) => {
  if (!isDevBillingToolsEnabled()) {
    return devToolsNotFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("callbackUrl", "/dev");
    return NextResponse.redirect(signIn);
  }

  if (!db) {
    return NextResponse.json(
      {
        error:
          "Postgres is not configured. Set DATABASE_URL or connect Supabase on Vercel (POSTGRES_URL), then run db:push.",
      },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);

  await upsertPolarBillingRow({
    userId,
    polarCustomerId: "dev_cus_checkout",
    polarSubscriptionId: `dev_sub_checkout_${userId.slice(0, 8)}`,
    status: "active",
    currentPeriodEnd: periodEnd,
  });

  await db
    .insert(userUsage)
    .values({ userId, freeQueriesUsed: 0, paidQueriesUsed: 0 })
    .onConflictDoNothing({ target: userUsage.userId });

  await db
    .update(userUsage)
    .set({ paidQueriesUsed: 0, updatedAt: new Date() })
    .where(eq(userUsage.userId, userId));

  const home = new URL("/", req.url);
  home.searchParams.set("dev_mock_checkout", "1");
  return NextResponse.redirect(home);
};
