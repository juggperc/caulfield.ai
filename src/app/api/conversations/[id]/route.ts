import { auth } from "@/auth";
import { db } from "@/lib/db";
import { chatMessages, conversations } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";

type RouteCtx = { params: Promise<{ id: string }> };

export const GET = async (_req: Request, ctx: RouteCtx) => {
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
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(chatMessages.createdAt);

  const messages: UIMessage[] = rows.map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: r.parts as UIMessage["parts"],
  }));

  return NextResponse.json({ conversation: conv, messages });
};

export const PATCH = async (req: Request, ctx: RouteCtx) => {
  const session = await auth();
  const { id } = await ctx.params;
  if (!db || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { title?: string };
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }
  const [updated] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.user.id)),
    )
    .returning();
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
};

export const DELETE = async (_req: Request, ctx: RouteCtx) => {
  const session = await auth();
  const { id } = await ctx.params;
  if (!db || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const removed = await db
    .delete(conversations)
    .where(
      and(eq(conversations.id, id), eq(conversations.userId, session.user.id)),
    )
    .returning({ id: conversations.id });
  if (removed.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
};
