import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit.ts";
import { db } from "../../lib/data.ts";
import { ok, fail } from "../../lib/http.ts";

export const prerender = false;

const MAX = 100;

export const GET: APIRoute = limited(async (_request, url) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return fail(400, "Pass a query.", "/api/search?q=malabon");
  if (q.length > 120) return fail(400, "Query is too long.");

  const raw = url.searchParams.get("limit");
  const limit = raw === null ? 25 : Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX) {
    return fail(400, `limit must be a whole number between 1 and ${MAX}.`);
  }

  const results = db().search(q, limit);
  return ok(results, { query: { q, limit }, count: results.length });
});
