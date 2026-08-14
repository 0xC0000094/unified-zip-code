import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit.ts";
import { db } from "../../lib/data.ts";
import { ok } from "../../lib/http.ts";

export const prerender = false;

export const GET: APIRoute = limited(async () => {
  const provinces = db().provinces();
  return ok(provinces, { count: provinces.length });
});
