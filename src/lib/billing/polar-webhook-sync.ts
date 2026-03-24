import { db } from "@/lib/db";
import { billingSubscription } from "@/lib/db/schema";

export type PolarBillingUpsert = {
  userId: string;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  status: "active" | "inactive";
  currentPeriodEnd: Date | null;
};

/**
 * Parse a Polar-style webhook JSON body (or compatible test payload).
 * Mirrors branching in the production webhook handler.
 */
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const parsePolarWebhookPayload = (
  payload: unknown,
): PolarBillingUpsert | null => {
  const obj = payload as Record<string, unknown>;
  const type = typeof obj.type === "string" ? obj.type : "";
  const data = (obj.data ?? obj.payload ?? obj) as Record<string, unknown>;

  const subscription = isRecord(data.subscription) ? data.subscription : null;
  const customer = isRecord(data.customer) ? data.customer : null;

  const merged: Record<string, unknown> = subscription
    ? { ...data, ...subscription }
    : { ...data };

  const metadataFromMerged = isRecord(merged.metadata)
    ? merged.metadata
    : undefined;
  const metadataFromData = isRecord(data.metadata) ? data.metadata : undefined;
  const custMeta = customer?.metadata;
  const metadataFromCustomer = isRecord(custMeta) ? custMeta : undefined;

  const metadata =
    metadataFromMerged ?? metadataFromData ?? metadataFromCustomer;

  const userId =
    typeof metadata?.userId === "string"
      ? metadata.userId
      : typeof merged.user_id === "string"
        ? merged.user_id
        : typeof data.user_id === "string"
          ? data.user_id
          : null;

  const customerId =
    typeof merged.customer_id === "string"
      ? merged.customer_id
      : typeof merged.customerId === "string"
        ? merged.customerId
        : typeof data.customer_id === "string"
          ? data.customer_id
          : typeof data.customerId === "string"
            ? data.customerId
            : typeof customer?.id === "string"
              ? customer.id
              : null;

  const subscriptionId =
    typeof merged.subscription_id === "string"
      ? merged.subscription_id
      : typeof merged.id === "string"
        ? merged.id
        : typeof data.subscription_id === "string"
          ? data.subscription_id
          : typeof data.id === "string"
            ? data.id
            : subscription && typeof subscription.id === "string"
              ? subscription.id
              : null;

  let periodEnd: Date | null = null;
  const pe =
    merged.current_period_end ??
    merged.currentPeriodEnd ??
    merged.ends_at ??
    data.current_period_end ??
    data.currentPeriodEnd ??
    data.ends_at;
  if (typeof pe === "string") {
    periodEnd = new Date(pe);
  } else if (typeof pe === "number") {
    periodEnd = new Date(pe * 1000);
  }

  const statusVal =
    merged.status ?? data.status ?? subscription?.status ?? type;

  const active =
    type.includes("active") ||
    type.includes("created") ||
    statusVal === "active";

  const inactive =
    type.includes("canceled") ||
    type.includes("cancelled") ||
    type.includes("revoked") ||
    statusVal === "canceled";

  if (!userId || !(active || inactive || customerId)) {
    return null;
  }

  const status = inactive ? "inactive" : active ? "active" : "inactive";

  return {
    userId,
    polarCustomerId: customerId,
    polarSubscriptionId: subscriptionId,
    status,
    currentPeriodEnd: periodEnd,
  };
};

export const upsertPolarBillingRow = async (
  input: PolarBillingUpsert,
): Promise<void> => {
  if (!db) return;

  await db
    .insert(billingSubscription)
    .values({
      userId: input.userId,
      polarCustomerId: input.polarCustomerId,
      polarSubscriptionId: input.polarSubscriptionId,
      status: input.status,
      currentPeriodEnd: input.currentPeriodEnd,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: billingSubscription.userId,
      set: {
        polarCustomerId: input.polarCustomerId,
        polarSubscriptionId: input.polarSubscriptionId,
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: new Date(),
      },
    });
};

export const applyPolarWebhookPayload = async (
  payload: unknown,
): Promise<{ applied: boolean; reason?: "no_database" }> => {
  if (!db) {
    return { applied: false, reason: "no_database" };
  }
  const parsed = parsePolarWebhookPayload(payload);
  if (!parsed) {
    const obj = payload as Record<string, unknown>;
    console.warn(
      "[polar-webhook-sync] Failed to parse payload",
      JSON.stringify({ type: obj.type ?? "unknown", hasData: Boolean(obj.data) }),
    );
    return { applied: false };
  }
  await upsertPolarBillingRow(parsed);
  console.info(
    "[polar-webhook-sync] Upserted billing row",
    JSON.stringify({
      status: parsed.status,
      hasCustomerId: Boolean(parsed.polarCustomerId),
      hasSubscriptionId: Boolean(parsed.polarSubscriptionId),
      hasPeriodEnd: Boolean(parsed.currentPeriodEnd),
    }),
  );
  return { applied: true };
};
