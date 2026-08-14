import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit.ts";
import { db } from "../../lib/data.ts";
import { ok, fail } from "../../lib/http.ts";

export const prerender = false;

export const GET: APIRoute = limited(async (_request, url) => {
  const province = url.searchParams.get("province");
  if (!province) {
    return fail(400, "Pass a province, by name or by its two letters.",
      "/api/municipalities?province=Bulacan");
  }
  const list = db().municipalities(province);
  return list.length
    ? ok(list, { query: { province }, count: list.length })
    : fail(404, `No province matches ${province}.`, "/api/provinces lists them all.");
});
