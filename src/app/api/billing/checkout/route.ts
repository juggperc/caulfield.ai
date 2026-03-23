import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Redirects to a Polar checkout. Prefer POLAR_CHECKOUT_URL (product link from Polar dashboard).
 * Optionally set metadata[userId] on the Polar side to match webhook handling.
 */
export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.POLAR_CHECKOUT_URL?.trim();
  if (!base) {
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
