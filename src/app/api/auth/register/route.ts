import { verifySolution } from "altcha-lib";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parsePassword, parseUsername } from "@/lib/auth/username";
import {
  getAltchaHmacKey,
  shouldBypassAltchaVerificationInDev,
} from "@/lib/altcha/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const bodySchema = z.object({
  username: z.string(),
  password: z.string(),
  altcha: z.string(),
});

export const POST = async (req: Request) => {
  if (!db) {
    return NextResponse.json(
      { error: "Could not register" },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not register" }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Could not register" }, { status: 400 });
  }

  const { username: rawUser, password: rawPass, altcha: altchaPayload } =
    parsedBody.data;

  const hmacKey = getAltchaHmacKey();
  const bypass = shouldBypassAltchaVerificationInDev();
  if (!bypass) {
    if (!hmacKey) {
      return NextResponse.json({ error: "Could not register" }, { status: 503 });
    }
    if (!altchaPayload) {
      return NextResponse.json({ error: "Could not register" }, { status: 400 });
    }
    const altchaOk = await verifySolution(altchaPayload, hmacKey);
    if (!altchaOk) {
      return NextResponse.json({ error: "Could not register" }, { status: 400 });
    }
  }

  const u = parseUsername(rawUser);
  if (!u.ok) {
    return NextResponse.json({ error: "Could not register" }, { status: 400 });
  }

  const p = parsePassword(rawPass);
  if (!p.ok) {
    return NextResponse.json({ error: "Could not register" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(p.password, 12);

  try {
    await db.insert(users).values({
      name: u.username,
      username: u.username,
      passwordHash,
      email: null,
    });
  } catch {
    return NextResponse.json({ error: "Could not register" }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
};
