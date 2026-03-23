import { auth } from "@/auth";
import {
  devToolsNotFound,
  isDevBillingToolsEnabled,
} from "@/lib/dev/dev-billing-tools";
import { getQuotaSnapshot } from "@/lib/billing/quota";
import { db } from "@/lib/db";
import { billingSubscription, userUsage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async () => {
  if (!isDevBillingToolsEnabled()) {
    return devToolsNotFound();
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const quota = await getQuotaSnapshot(userId);

  if (!db) {
    return NextResponse.json({
      env: { databaseConfigured: false },
      user: {
        id: userId,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
      },
      quota,
      billingSubscription: null,
      userUsage: null,
    });
  }

  const [subRow] = await db
    .select()
    .from(billingSubscription)
    .where(eq(billingSubscription.userId, userId))
    .limit(1);

  const [usageRow] = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId))
    .limit(1);

  return NextResponse.json({
    env: { databaseConfigured: true },
    user: {
      id: userId,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    },
    quota,
    billingSubscription: subRow ?? null,
    userUsage: usageRow ?? null,
  });
};
