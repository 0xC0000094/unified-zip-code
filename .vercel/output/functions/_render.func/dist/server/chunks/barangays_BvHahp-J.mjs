import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as ok, r as limited, t as fail } from "./http_D5bTSrTB.mjs";
import { t as db } from "./data_E6CF-Sjg.mjs";
//#region src/pages/api/barangays.ts
var barangays_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = limited(async (_request, url) => {
	const municipality = url.searchParams.get("municipality");
	const province = url.searchParams.get("province") ?? void 0;
	if (!municipality) return fail(400, "Pass a municipality, by name or by its four character code.", "/api/barangays?municipality=BC23");
	const list = db().barangays(municipality, province);
	return list.length ? ok(list, {
		query: {
			municipality,
			province
		},
		count: list.length
	}) : fail(404, `No municipality matches ${municipality}.`, province ? void 0 : "If the name is ambiguous, add province.");
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/barangays@_@ts
var page = () => barangays_exports;
//#endregion
export { page };
