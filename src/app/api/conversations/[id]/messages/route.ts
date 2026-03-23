import { auth } from "@/auth";
import { db } from "@/lib/db";
import { chatMessages, conversations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ id: string }> };

export const PUT = async (req: Request, ctx: RouteCtx) => {
  const session = await auth();
  const { id } = await ctx.params;
  if (!db || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.user.id)),
    )
    .limit(1);
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as { messages?: UIMessage[] };
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  await db.delete(chatMessages).where(eq(chatMessages.conversationId, id));

  if (body.messages.length > 0) {
    await db.insert(chatMessages).values(
      body.messages.map((m) => ({
        id: m.id,
        conversationId: id,
        role: m.role,
        parts: m.parts as unknown[],
      })),
    );
  }

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));

  return NextResponse.json({ ok: true });
};
