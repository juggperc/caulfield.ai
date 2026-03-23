import { applyPolarWebhookPayload } from "@/lib/billing/polar-webhook-sync";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Polar webhook — Standard Webhooks format.
 * Headers: webhook-id, webhook-timestamp, webhook-signature
 * Signature: v1,<base64-hmac> where HMAC signs "{id}.{timestamp}.{body}"
 *
 * Configure POLAR_WEBHOOK_SECRET in Polar dashboard and set the same value here.
 */
export const POST = async (req: Request) => {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim();
  const raw = await req.text();

  if (secret) {
    const webhookId = req.headers.get("webhook-id");
    const webhookTimestamp = req.headers.get("webhook-timestamp");
    const webhookSignature = req.headers.get("webhook-signature");

    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      console.warn("[polar-webhook] Missing required Standard Webhooks headers");
      return NextResponse.json(
        { error: "Missing webhook signature headers" },
        { status: 401 },
      );
    }

    // Guard against replay: reject timestamps older than 5 minutes
    const ts = parseInt(webhookTimestamp, 10);
    if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      console.warn("[polar-webhook] Timestamp outside tolerance window");
      return NextResponse.json(
        { error: "Webhook timestamp too old or invalid" },
        { status: 401 },
      );
    }

    // Standard Webhooks: sign "{id}.{timestamp}.{body}" with the secret
    // Secret may be prefixed with "whsec_" and base64-encoded
    const secretBytes = secret.startsWith("whsec_")
      ? Buffer.from(secret.slice(6), "base64")
      : Buffer.from(secret, "utf-8");

    const signPayload = `${webhookId}.${webhookTimestamp}.${raw}`;
    const expectedSig = createHmac("sha256", secretBytes)
      .update(signPayload)
      .digest("base64");

    // webhook-signature can contain multiple space-separated sigs (v1,<sig> v1,<sig2>)
    const signatures = webhookSignature.split(" ");
    const verified = signatures.some((sigEntry) => {
      const parts = sigEntry.split(",");
      if (parts[0] !== "v1" || !parts[1]) return false;
      const candidate = parts[1];
      if (candidate.length !== expectedSig.length) return false;
      return timingSafeEqual(
        Buffer.from(candidate, "base64"),
        Buffer.from(expectedSig, "base64"),
      );
    });

    if (!verified) {
      console.warn("[polar-webhook] Signature verification failed");
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await applyPolarWebhookPayload(payload);
  if (result.reason === "no_database") {
    return NextResponse.json({ ok: true, skipped: "no_database" });
  }

  return NextResponse.json({ ok: true });
};
