// Fixed-window rate limiter (in memory, per server instance).
//
// Best-effort protection for the inquiry action: on serverless platforms
// each instance keeps its own window, so this bounds bursts rather than
// guaranteeing a global quota. Pair it with the database-side limits in
// supabase/migrations (length checks) and, if needed, an edge/WAF rule.

export interface RateLimiter {
  /** Records a hit for `key`; returns true when the hit is allowed. */
  hit(key: string, now?: number): boolean;
}

export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const hits = new Map<string, { count: number; start: number }>();
  return {
    hit(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || now - entry.start >= windowMs) {
        if (hits.size >= maxKeys) {
          // Drop expired windows first; if still full, drop the oldest key.
          for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
          if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
        }
        hits.set(key, { count: 1, start: now });
        return true;
      }
      entry.count += 1;
      return entry.count <= limit;
    },
  };
}

/** Client IP from standard proxy headers; "unknown" when absent. */
export function clientKey(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
