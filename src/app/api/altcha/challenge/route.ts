import { createChallenge } from "altcha-lib";
import { NextResponse } from "next/server";

import { getAltchaHmacKey } from "@/lib/altcha/server";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const hmacKey = getAltchaHmacKey();
  if (!hmacKey) {
    const isProd = process.env.NODE_ENV === "production";
    return NextResponse.json(
      {
        error: isProd
          ? "ALTCHA is not configured (ALTCHA_HMAC_KEY)"
          : "Set ALTCHA_HMAC_KEY to enable the ALTCHA widget (verification can be bypassed in dev with ALTCHA_DEV_BYPASS=1)",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const challenge = await createChallenge({ hmacKey, maxNumber: 1_000_000 });
  return NextResponse.json(challenge, {
    headers: { "Cache-Control": "no-store" },
  });
};
