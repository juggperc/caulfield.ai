import { libraryDatabaseNameForScope } from "@/features/library/idb";

const CAULFIELD_PREFIX = "caulfield.";

/** Remove persisted workspace and connector data for this browser (per sign-out / account switch). */
export const clearCaulfieldBrowserStores = (accountScope: string): void => {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(CAULFIELD_PREFIX)) localStorage.removeItem(k);
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CAULFIELD_PREFIX)) sessionStorage.removeItem(k);
    }
  } catch {
    /* private mode / quota */
  }
  try {
    const legacy = "caulfield.library.v1";
    indexedDB.deleteDatabase(legacy);
    indexedDB.deleteDatabase(libraryDatabaseNameForScope(accountScope));
  } catch {
    /* idb unavailable */
  }
};
