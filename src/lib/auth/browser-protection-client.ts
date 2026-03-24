"use client";

export const fetchBrowserProtectionToken = async (): Promise<string> => {
  const res = await fetch("/api/auth/browser-check", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("browser-check-failed");
  }

  const data = (await res.json()) as { token?: unknown };
  if (typeof data.token !== "string" || data.token.trim().length === 0) {
    throw new Error("browser-check-invalid");
  }

  return data.token;
};
