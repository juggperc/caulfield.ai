import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async () => {
  const session = await auth();
  if (!db) {
    return NextResponse.json([]);
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt));
  return NextResponse.json(rows);
};

export const POST = async () => {
  const session = await auth();
  if (!db || !session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [row] = await db
    .insert(conversations)
    .values({ userId: session.user.id, title: "New chat" })
    .returning();
  return NextResponse.json(row);
};
