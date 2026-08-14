import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit.ts";
import { db } from "../../lib/data.ts";
import { ok, fail } from "../../lib/http.ts";

export const prerender = false;

export const GET: APIRoute = limited(async (_request, url) => {
  const municipality = url.searchParams.get("municipality");
  const province = url.searchParams.get("province") ?? undefined;
  if (!municipality) {
    return fail(400, "Pass a municipality, by name or by its four character code.",
      "/api/barangays?municipality=BC23");
  }
  const list = db().barangays(municipality, province);
  return list.length
    ? ok(list, { query: { municipality, province }, count: list.length })
    : fail(404, `No municipality matches ${municipality}.`,
        province ? undefined : "If the name is ambiguous, add province.");
});
