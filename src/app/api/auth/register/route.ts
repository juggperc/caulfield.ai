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

const isUniqueViolation = (err: unknown): boolean => {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  return code === "23505";
};

export const POST = async (req: Request) => {
  if (!db) {
    return NextResponse.json(
      {
        error: "Sign-up is temporarily unavailable.",
        code: "SERVICE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request.", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request.", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const { username: rawUser, password: rawPass, altcha: altchaPayload } =
    parsedBody.data;

  const hmacKey = getAltchaHmacKey();
  const bypass = shouldBypassAltchaVerificationInDev();
  if (!bypass) {
    if (!hmacKey) {
      return NextResponse.json(
        {
          error: "Sign-up is temporarily unavailable.",
          code: "ALTCHA_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }
    if (!altchaPayload) {
      return NextResponse.json(
        {
          error: "Complete the verification challenge.",
          code: "ALTCHA_REQUIRED",
        },
        { status: 400 },
      );
    }
    const altchaOk = await verifySolution(altchaPayload, hmacKey);
    if (!altchaOk) {
      return NextResponse.json(
        {
          error: "Verification failed. Try again.",
          code: "ALTCHA_FAILED",
        },
        { status: 400 },
      );
    }
  }

  const u = parseUsername(rawUser);
  if (!u.ok) {
    return NextResponse.json(
      { error: u.message, code: "USERNAME_INVALID" },
      { status: 400 },
    );
  }

  const p = parsePassword(rawPass);
  if (!p.ok) {
    return NextResponse.json(
      { error: p.message, code: "PASSWORD_INVALID" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(p.password, 12);

  try {
    await db.insert(users).values({
      name: u.username,
      username: u.username,
      passwordHash,
      email: null,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "That username is already taken.", code: "USERNAME_TAKEN" },
        { status: 409 },
      );
    }
    console.error("[register] database insert failed", err);
    return NextResponse.json(
      {
        error: "Could not create your account. Try again later.",
        code: "DATABASE_ERROR",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
};
