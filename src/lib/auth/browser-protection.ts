import { createHmac, timingSafeEqual } from "node:crypto";

const BOT_PROTECTION_MAX_AGE_MS = 30 * 60 * 1000;
const BOT_PROTECTION_MIN_AGE_MS = 1200;

type BrowserProtectionPayload = {
  readonly issuedAt: number;
};

const getBrowserProtectionSecret = () =>
  process.env.AUTH_SECRET?.trim() ||
  "caulfield-dev-only-browser-protection-secret";

const encodePayload = (payload: BrowserProtectionPayload) =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

const decodePayload = (raw: string): BrowserProtectionPayload | null => {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<BrowserProtectionPayload>;
    if (typeof parsed.issuedAt !== "number" || !Number.isFinite(parsed.issuedAt)) {
      return null;
    }
    return { issuedAt: parsed.issuedAt };
  } catch {
    return null;
  }
};

const signPayload = (payload: string) =>
  createHmac("sha256", getBrowserProtectionSecret())
    .update(payload)
    .digest("base64url");

export const createBrowserProtectionToken = () => {
  const payload = encodePayload({ issuedAt: Date.now() });
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
};

export const verifyBrowserProtection = async ({
  token,
  honeypot,
  now = Date.now(),
}: {
  readonly token: string;
  readonly honeypot?: string | null;
  readonly now?: number;
}): Promise<{ ok: true } | { ok: false; reason: "invalid" | "too_fast" | "stale" }> => {
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return { ok: false, reason: "invalid" };
  }

  const [rawPayload, rawSignature] = token.split(".");
  if (!rawPayload || !rawSignature) {
    return { ok: false, reason: "invalid" };
  }

  const expectedSignature = signPayload(rawPayload);
  const provided = Buffer.from(rawSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return { ok: false, reason: "invalid" };
  }

  const payload = decodePayload(rawPayload);
  if (!payload) {
    return { ok: false, reason: "invalid" };
  }

  const ageMs = now - payload.issuedAt;
  if (ageMs < BOT_PROTECTION_MIN_AGE_MS) {
    return { ok: false, reason: "too_fast" };
  }
  if (ageMs > BOT_PROTECTION_MAX_AGE_MS) {
    return { ok: false, reason: "stale" };
  }

  return { ok: true };
};
