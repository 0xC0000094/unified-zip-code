/** Shared JSON response helpers, so every route answers the same shape. */

export type Meta = Record<string, unknown>;

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600, s-maxage=86400",
      ...(init.headers ?? {}),
    },
  });
}

export function ok(data: unknown, meta: Meta = {}): Response {
  return json({ ok: true, ...meta, data });
}

export function fail(status: number, error: string, hint?: string): Response {
  return json({ ok: false, error, ...(hint ? { hint } : {}) }, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
