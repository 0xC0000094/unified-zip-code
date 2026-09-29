import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit.ts";
import { db } from "../../lib/data.ts";
import { ok, fail } from "../../lib/http.ts";
import { isValid } from "../../index.js";

export const prerender = false;

export const GET: APIRoute = limited(async (_request, url) => {
  const code = url.searchParams.get("code");
  const psgc = url.searchParams.get("psgc");
  const postal = url.searchParams.get("postal");

  if (!code && !psgc && !postal) {
    return fail(400, "Pass code, psgc or postal.", "/api/lookup?code=BC23023");
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

  if (postal) {
    if (!/^\d{4}$/.test(postal.trim())) {
      return fail(400, `${postal} is not a four digit zip code.`, "/api/lookup?postal=3006");
    }
    const records = db().fromPostal(postal);
    return records.length
      ? ok(records, { query: { postal }, count: records.length })
      : fail(404, `No barangay carries the zip code ${postal.trim()}.`);
  }

  const record = db().fromPsgc(psgc!);
  return record
    ? ok(record, { query: { psgc } })
    : fail(404, `No barangay carries the PSGC ${psgc}.`);
});
