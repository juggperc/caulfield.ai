import { z } from "zod";

export const normalizeUsername = (raw: string): string =>
  raw.trim().toLowerCase();

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .regex(
    /^[a-z0-9_]+$/,
    "Username may only contain lowercase letters, numbers, and underscores",
  );

export const parseUsername = (
  raw: string,
): { ok: true; username: string } | { ok: false; message: string } => {
  const normalized = normalizeUsername(raw);
  const parsed = usernameSchema.safeParse(normalized);
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0];
    return { ok: false, message: first ?? "Invalid username" };
  }
  return { ok: true, username: parsed.data };
};

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const parsePassword = (
  raw: string,
): { ok: true; password: string } | { ok: false; message: string } => {
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0];
    return { ok: false, message: first ?? "Invalid password" };
  }
  return { ok: true, password: parsed.data };
};
