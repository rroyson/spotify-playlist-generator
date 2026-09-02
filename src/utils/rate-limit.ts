const WINDOW_MS = 60 * 60 * 1000;
const SWEEP_ABOVE_ENTRIES = 1000;

// ponytail: in-memory, per server instance; swap for a shared store if the app ever runs on more than one instance
const hits = new Map<string, number[]>();

/**
 * Sliding one-hour window. Records the hit and returns true when the key has
 * already used its allowance, in which case the hit is not recorded.
 */
export function isOverLimit(key: string, limit: number, now = Date.now()): boolean {
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > SWEEP_ABOVE_ENTRIES) {
    for (const [k, times] of hits) {
      if (now - times[times.length - 1] >= WINDOW_MS) hits.delete(k);
    }
  }

  return false;
}
