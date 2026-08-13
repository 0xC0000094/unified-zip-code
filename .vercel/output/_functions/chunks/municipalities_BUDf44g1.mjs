import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as ok, r as limited, t as fail } from "./http_D5bTSrTB.mjs";
import { t as db } from "./data_E6CF-Sjg.mjs";
//#region src/pages/api/municipalities.ts
var municipalities_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = limited(async (_request, url) => {
	const province = url.searchParams.get("province");
	if (!province) return fail(400, "Pass a province, by name or by its two letters.", "/api/municipalities?province=Bulacan");
	const list = db().municipalities(province);
	return list.length ? ok(list, {
		query: { province },
		count: list.length
	}) : fail(404, `No province matches ${province}.`, "/api/provinces lists them all.");
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/municipalities@_@ts
var page = () => municipalities_exports;
//#endregion
export { page };
