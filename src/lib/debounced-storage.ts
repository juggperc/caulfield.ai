const pendingWrites = new Map<
  string,
  { value: string; timer: ReturnType<typeof setTimeout> }
>();
const DEBOUNCE_MS = 300;

export const debouncedSetItem = (key: string, value: string): void => {
  const existing = pendingWrites.get(key);
  if (existing) {
    clearTimeout(existing.timer);
  }
  const timer = setTimeout(() => {
    try {
      localStorage.setItem(key, value);
      pendingWrites.delete(key);
    } catch {
      // quota exceeded
    }
  }, DEBOUNCE_MS);
  pendingWrites.set(key, { value, timer });
};

export const flushPendingWrites = (): void => {
  for (const [key, { value, timer }] of pendingWrites) {
    clearTimeout(timer);
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
    pendingWrites.delete(key);
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", flushPendingWrites);
}
