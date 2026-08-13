import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit";
import { db } from "../../lib/data";
import { ok } from "../../lib/http";

export const prerender = false;

export const GET: APIRoute = limited(async () => {
  const provinces = db().provinces();
  return ok(provinces, { count: provinces.length });
});
