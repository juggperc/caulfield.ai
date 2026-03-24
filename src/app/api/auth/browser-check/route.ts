import { NextResponse } from "next/server";

import { createBrowserProtectionToken } from "@/lib/auth/browser-protection";

export const dynamic = "force-dynamic";

export const GET = () =>
  NextResponse.json(
    { token: createBrowserProtectionToken() },
    { headers: { "Cache-Control": "no-store" } },
  );
