import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as ok, r as limited } from "./http_D5bTSrTB.mjs";
import { t as db } from "./data_E6CF-Sjg.mjs";
//#region src/pages/api/provinces.ts
var provinces_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = limited(async () => {
	const provinces = db().provinces();
	return ok(provinces, { count: provinces.length });
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/provinces@_@ts
var page = () => provinces_exports;
//#endregion
export { page };
