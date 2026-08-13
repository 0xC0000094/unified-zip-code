/**
 * A sliding window rate limiter held in memory.
 *
 * What this is honest about: on Vercel each serverless container keeps its own
 * counter, so a client spread across several containers gets a higher effective
 * limit than the number below, and a cold start resets the window. That is
 * fine for a public demonstration API and it is not fine for anything that has
 * to be enforced. Enforcing it properly means a shared store, which is the
 * trade this project has not paid for.
 */

const WINDOW_MS = 60_000;
const LIMIT = 60;

/** ip -> request timestamps inside the current window */
const hits = new Map<string, number[]>();
let lastSweep = 0;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds at which the window frees up. */
  reset: number;
  retryAfter: number;
}

/**
 * The client address. Vercel sets x-forwarded-for; the left-most entry is the
 * client, the rest are proxies. Falls back to a single bucket, which means an
 * unknown caller is limited alongside every other unknown caller rather than
 * escaping the limit.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimit(ip: string, now = Date.now()): RateLimitResult {
  // Drop cold buckets occasionally so the map cannot grow without bound.
  if (now - lastSweep > WINDOW_MS) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
    lastSweep = now;
  }

  const times = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  const allowed = times.length < LIMIT;
  if (allowed) times.push(now);
  hits.set(ip, times);

  const oldest = times[0] ?? now;
  const reset = Math.ceil((oldest + WINDOW_MS) / 1000);
  return {
    allowed,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - times.length),
    reset,
    retryAfter: Math.max(1, reset - Math.floor(now / 1000)),
  };
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "x-ratelimit-limit": String(r.limit),
    "x-ratelimit-remaining": String(r.remaining),
    "x-ratelimit-reset": String(r.reset),
  };
}

/**
 * Wrap a handler so every route is limited the same way and every response
 * carries the same headers.
 */
export function limited(
  handler: (request: Request, url: URL) => Response | Promise<Response>,
) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    const result = rateLimit(clientIp(request));
    const headers = rateLimitHeaders(result);

    if (!result.allowed) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            error: "Rate limit exceeded.",
            hint: `${result.limit} requests a minute. Try again in ${result.retryAfter}s.`,
          },
          null,
          2,
        ),
        {
          status: 429,
          headers: {
            ...headers,
            "content-type": "application/json; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "no-store",
            "retry-after": String(result.retryAfter),
          },
        },
      );
    }

    const response = await handler(request, new URL(request.url));
    for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
    return response;
  };
}

/** Exposed for tests. */
export function _reset(): void {
  hits.clear();
  lastSweep = 0;
}
