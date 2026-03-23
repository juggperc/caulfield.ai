/**
 * Client storage scope for workspace data. Updated synchronously from the
 * session on each render (see `SessionBridge`) so child effects see the correct
 * user id before reading localStorage / IndexedDB.
 */
const SESSION_USER_KEY = "caulfield.auth.userId";

let liveAccountScope = "anon";

/** Called from `SessionBridge` render so scope is correct before child effects run. */
export const syncLiveAccountStorageScope = (scope: string): void => {
  const s = scope.trim();
  liveAccountScope =
    s.length > 0 && s.length < 256 ? s : "anon";
};

/** Wire session user id to sessionStorage for refresh and debugging. */
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
  return liveAccountScope;
};

export const scopedStorageKey = (baseKey: string): string => {
  const scope = getAccountStorageScope();
  return `${baseKey}:${scope}`;
};

const LAST_SERVER_CONV_KEY = "caulfield.chat.lastServerConversationId.v1";

const lastServerConversationStorageKey = (): string =>
  `${LAST_SERVER_CONV_KEY}:${getAccountStorageScope()}`;

/** Prefer this conversation after refresh when still present in the server list. */
export const readLastServerConversationId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(lastServerConversationStorageKey())?.trim();
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
};

export const writeLastServerConversationId = (id: string | null): void => {
  if (typeof window === "undefined") return;
  try {
    const k = lastServerConversationStorageKey();
    const trimmed = id?.trim();
    if (trimmed && trimmed.length > 0) sessionStorage.setItem(k, trimmed);
    else sessionStorage.removeItem(k);
  } catch {
    /* private mode */
  }
};
