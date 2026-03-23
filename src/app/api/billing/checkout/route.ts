import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Redirects to a Polar checkout. Prefer POLAR_CHECKOUT_URL (product link from Polar dashboard).
 * Optionally set metadata[userId] on the Polar side to match webhook handling.
 *
 * In development, when POLAR_CHECKOUT_URL is unset, redirects to the mock checkout
 * handler so Subscribe and quota flows can be tested without Polar.
 */
export const GET = async (req: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.POLAR_CHECKOUT_URL?.trim();
  if (!base) {
    if (process.env.NODE_ENV === "development") {
      const mock = new URL("/api/dev/billing/mock-checkout", req.url);
      return NextResponse.redirect(mock);
    }
    return NextResponse.json(
      {
        error:
          "POLAR_CHECKOUT_URL is not configured. Add your Polar product checkout link.",
      },
      { status: 500 },
    );
  }

  const url = new URL(base);
  if (session.user.email) {
    url.searchParams.set("customer_email", session.user.email);
  }
  url.searchParams.set("metadata[userId]", session.user.id);

  return NextResponse.redirect(url.toString());
};
