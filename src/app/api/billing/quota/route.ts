import { auth } from "@/auth";
import { getQuotaSnapshot } from "@/lib/billing/quota";
import { NextResponse } from "next/server";

export const GET = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }
  const snap = await getQuotaSnapshot(session.user.id);
  return NextResponse.json(snap);
};
