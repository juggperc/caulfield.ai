import { NextResponse } from "next/server";

/** Billing/account simulation APIs and /dev UI are only available in development. */
export const isDevBillingToolsEnabled = (): boolean =>
  process.env.NODE_ENV === "development";

export const devToolsNotFound = (): NextResponse =>
  NextResponse.json({ error: "Not found" }, { status: 404 });
