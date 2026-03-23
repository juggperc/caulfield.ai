import { db } from "@/lib/db";
import { billingSubscription } from "@/lib/db/schema";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Polar webhook — shape varies by API version; we branch on common fields.
 * Configure POLAR_WEBHOOK_SECRET in Polar dashboard and set the same value here.
 */
export const POST = async (req: Request) => {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  const raw = await req.text();

  if (secret) {
    const sig = req.headers.get("webhook-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const ok =
      sig.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!db) {
    return NextResponse.json({ ok: true, skipped: "no_database" });
  }

  const obj = payload as Record<string, unknown>;
  const type = typeof obj.type === "string" ? obj.type : "";
  const data = (obj.data ?? obj.payload ?? obj) as Record<string, unknown>;

  const metadata = data.metadata as Record<string, unknown> | undefined;
  const userId =
    typeof metadata?.userId === "string"
      ? metadata.userId
      : typeof data.user_id === "string"
        ? data.user_id
        : null;

  const customerId =
    typeof data.customer_id === "string"
      ? data.customer_id
      : typeof data.customerId === "string"
        ? data.customerId
        : null;

  const subscriptionId =
    typeof data.subscription_id === "string"
      ? data.subscription_id
      : typeof data.id === "string"
        ? data.id
        : null;

  let periodEnd: Date | null = null;
  const pe =
    data.current_period_end ?? data.currentPeriodEnd ?? data.ends_at;
  if (typeof pe === "string") {
    periodEnd = new Date(pe);
  } else if (typeof pe === "number") {
    periodEnd = new Date(pe * 1000);
  }

  const active =
    type.includes("active") ||
    type.includes("created") ||
    data.status === "active";

  const inactive =
    type.includes("canceled") ||
    type.includes("cancelled") ||
    type.includes("revoked") ||
    data.status === "canceled";

  if (userId && (active || inactive || customerId)) {
    const status = inactive ? "inactive" : active ? "active" : "inactive";
    await db
      .insert(billingSubscription)
      .values({
        userId,
        polarCustomerId: customerId ?? null,
        polarSubscriptionId: subscriptionId ?? null,
        status,
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: billingSubscription.userId,
        set: {
          polarCustomerId: customerId ?? null,
          polarSubscriptionId: subscriptionId ?? null,
          status,
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        },
      });
  }

  return NextResponse.json({ ok: true });
};
