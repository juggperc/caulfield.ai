import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAgentDebugLog } from "@/lib/debug/agent-log";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  hypothesisId: z.string(),
  location: z.string(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.number().optional(),
});

export const POST = async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  writeAgentDebugLog(parsed.data);
  return new NextResponse(null, { status: 204 });
};
