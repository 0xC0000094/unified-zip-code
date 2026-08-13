import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as ok, r as limited } from "./http_D5bTSrTB.mjs";
import { t as db } from "./data_E6CF-Sjg.mjs";
//#region src/pages/api/index.ts
var api_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = limited(async (_request, url) => {
	const base = url.origin;
	return ok({
		name: "Unified ZIP Code",
		description: "A seven character postal code for the Philippines, resolving to the barangay.",
		version: db().version,
		barangays: db().count,
		rateLimit: "60 requests a minute per address",
		endpoints: [
			{
				path: "/api/lookup?code=BC23023",
				returns: "one barangay"
			},
			{
				path: "/api/lookup?psgc=031422023",
				returns: "one barangay"
			},
			{
				path: "/api/search?q=malabon&limit=25",
				returns: "matching barangays"
			},
			{
				path: "/api/provinces",
				returns: "all 82 provinces"
			},
			{
				path: "/api/municipalities?province=Bulacan",
				returns: "municipalities"
			},
			{
				path: "/api/barangays?municipality=BC23",
				returns: "barangays"
			}
		].map((e) => ({
			...e,
			url: base + e.path
		})),
		source: "https://github.com/0xC0000094/unified-zip-code"
	}, { endpoint: "index" });
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/index@_@ts
var page = () => api_exports;
//#endregion
export { page };
