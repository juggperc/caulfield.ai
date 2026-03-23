/**
 * Namespace for all persisted client data. When Vercel Auth lands, set
 * `sessionStorage.setItem("caulfield.auth.userId", user.id)` on login and remove
 * on logout; until then everything stays on `anon`.
 *
 * Future: migrate keys from `anon` to `${userId}` on first login (one-time copy).
 */
const SESSION_USER_KEY = "caulfield.auth.userId";

/** Wire this from Vercel Auth after login / before logout. */
export const setAccountSessionUserId = (userId: string | null): void => {
  if (typeof window === "undefined") return;
  try {
    if (userId) sessionStorage.setItem(SESSION_USER_KEY, userId);
    else sessionStorage.removeItem(SESSION_USER_KEY);
  } catch {
    /* private mode */
  }
};

export const getAccountStorageScope = (): string => {
  if (typeof window === "undefined") return "anon";
  try {
    const id = sessionStorage.getItem(SESSION_USER_KEY)?.trim();
    if (id && id.length > 0 && id.length < 256) return id;
  } catch {
    /* private mode */
  }
  return "anon";
};

export const scopedStorageKey = (baseKey: string): string => {
  const scope = getAccountStorageScope();
  return `${baseKey}:${scope}`;
};
