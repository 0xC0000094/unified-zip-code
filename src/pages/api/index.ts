import type { APIRoute } from "astro";
import { limited } from "../../lib/rate-limit.ts";
import { db } from "../../lib/data.ts";
import { ok } from "../../lib/http.ts";

export const prerender = false;

export const GET: APIRoute = limited(async (_request, url) => {
  const base = url.origin;
  return ok(
    {
      name: "Unified ZIP Code",
      description:
        "A seven character postal code for the Philippines, resolving to the barangay.",
      version: db().version,
      barangays: db().count,
      rateLimit: "60 requests a minute per address",
      endpoints: [
        { path: "/api/lookup?code=BC23023", returns: "one barangay" },
        { path: "/api/lookup?psgc=031422023", returns: "one barangay" },
        { path: "/api/search?q=malabon&limit=25", returns: "matching barangays" },
        { path: "/api/provinces", returns: "all 82 provinces" },
        { path: "/api/municipalities?province=Bulacan", returns: "municipalities" },
        { path: "/api/barangays?municipality=BC23", returns: "barangays" },
      ].map((e) => ({ ...e, url: base + e.path })),
      source: "https://github.com/0xC0000094/unified-zip-code",
    },
    { endpoint: "index" },
  );
});
