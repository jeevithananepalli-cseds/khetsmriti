// Fixed-window, in-memory rate limiter for routes that spend LLM / memory quota.
// Good enough for a single-instance deployment; swap for a shared store if the app is scaled out.

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

interface Window {
  start: number;
  count: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter(rule: RateLimitRule, now: () => number = Date.now) {
  const windows = new Map<string, Window>();

  return function check(key: string): RateLimitResult {
    const t = now();
    const current = windows.get(key);
    if (!current || t - current.start >= rule.windowMs) {
      windows.set(key, { start: t, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= rule.limit) {
      return { allowed: false, retryAfterSeconds: Math.ceil((current.start + rule.windowMs - t) / 1000) };
    }
    windows.set(key, { start: current.start, count: current.count + 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

/** Best-effort client key: first X-Forwarded-For hop, then X-Real-IP, else a shared bucket. */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "local";
}
