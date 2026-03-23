import { applyPolarWebhookPayload } from "@/lib/billing/polar-webhook-sync";
import {
  devToolsNotFound,
  isDevBillingToolsEnabled,
} from "@/lib/dev/dev-billing-tools";
import { NextResponse } from "next/server";

/**
 * POST raw Polar-style JSON (same shape as the real webhook) without signature checks.
 * Use from /dev to verify payload parsing and DB updates locally.
 */
export const POST = async (req: Request) => {
  if (!isDevBillingToolsEnabled()) {
    return devToolsNotFound();
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await applyPolarWebhookPayload(payload);
  return NextResponse.json({
    ok: true,
    applied: result.applied,
    skipped: result.reason === "no_database" ? "no_database" : undefined,
  });
};
