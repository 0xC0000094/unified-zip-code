import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit.ts";
import { db } from "../../lib/data.ts";
import { ok, fail } from "../../lib/http.ts";
import { isValid } from "../../index.js";

export const prerender = false;

export const GET: APIRoute = limited(async (_request, url) => {
  const code = url.searchParams.get("code");
  const psgc = url.searchParams.get("psgc");

  if (!code && !psgc) {
    return fail(400, "Pass either code or psgc.", "/api/lookup?code=BC23023");
  }

  if (code) {
    if (!isValid(code)) {
      return fail(
        400,
        `${code} is not a well formed code.`,
        "Two letters, two digits, three digits. BC23023.",
      );
    }
    const record = db().get(code);
    return record
      ? ok(record, { query: { code } })
      : fail(404, `No barangay carries the code ${code.toUpperCase()}.`);
  }

  const record = db().fromPsgc(psgc!);
  return record
    ? ok(record, { query: { psgc } })
    : fail(404, `No barangay carries the PSGC ${psgc}.`);
});
