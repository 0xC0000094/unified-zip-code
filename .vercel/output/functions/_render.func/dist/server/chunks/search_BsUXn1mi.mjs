import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as ok, r as limited, t as fail } from "./http_D5bTSrTB.mjs";
import { t as db } from "./data_E6CF-Sjg.mjs";
//#region src/pages/api/search.ts
var search_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var MAX = 100;
var GET = limited(async (_request, url) => {
	const q = (url.searchParams.get("q") ?? "").trim();
	if (!q) return fail(400, "Pass a query.", "/api/search?q=malabon");
	if (q.length > 120) return fail(400, "Query is too long.");
	const raw = url.searchParams.get("limit");
	const limit = raw === null ? 25 : Number(raw);
	if (!Number.isInteger(limit) || limit < 1 || limit > MAX) return fail(400, `limit must be a whole number between 1 and ${MAX}.`);
	const results = db().search(q, limit);
	return ok(results, {
		query: {
			q,
			limit
		},
		count: results.length
	});
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/search@_@ts
var page = () => search_exports;
//#endregion
export { page };
