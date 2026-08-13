import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { n as ok, r as limited, t as fail } from "./http_D5bTSrTB.mjs";
import { n as isValid, t as db } from "./data_E6CF-Sjg.mjs";
//#region src/pages/api/lookup.ts
var lookup_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var GET = limited(async (_request, url) => {
	const code = url.searchParams.get("code");
	const psgc = url.searchParams.get("psgc");
	if (!code && !psgc) return fail(400, "Pass either code or psgc.", "/api/lookup?code=BC23023");
	if (code) {
		if (!isValid(code)) return fail(400, `${code} is not a well formed code.`, "Two letters, two digits, three digits. BC23023.");
		const record = db().get(code);
		return record ? ok(record, { query: { code } }) : fail(404, `No barangay carries the code ${code.toUpperCase()}.`);
	}
	const record = db().fromPsgc(psgc);
	return record ? ok(record, { query: { psgc } }) : fail(404, `No barangay carries the PSGC ${psgc}.`);
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/lookup@_@ts
var page = () => lookup_exports;
//#endregion
export { page };
