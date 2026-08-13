import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { UnifiedZipCode, parse, isValid } from "../src/index.js";

const data = JSON.parse(readFileSync(new URL("../data/unified-zip-codes.json", import.meta.url)));
const uzc = new UnifiedZipCode(data);

test("parses a well formed code without the data", () => {
  assert.deepEqual(parse("BC23023"), {
    province: "BC", municipality: "BC23", barangay: "023", code: "BC23023",
  });
  assert.equal(parse(" bc23023 ").code, "BC23023");
});

test("rejects malformed codes", () => {
  for (const bad of ["", null, "BC2302", "BC230234", "B123023", "BCAB023", "1234567"]) {
    assert.equal(parse(bad), null, `${bad} should not parse`);
    assert.equal(isValid(bad), false);
  }
});

test("the worked example from the writeup resolves", () => {
  const r = uzc.get("BC23023");
  assert.equal(r.province, "Bulacan");
  assert.equal(r.municipality, "San Rafael");
  assert.equal(r.barangay, "Poblacion");
  assert.equal(r.psgc, "031422023");
});

test("holds the whole delivered code set", () => {
  assert.equal(uzc.count, 42047);
  assert.equal(uzc.provinces().length, 82);
  assert.equal(
    uzc.provinces().reduce((n, p) => n + uzc.municipalities(p.code).length, 0), 1634);
});

test("every code is unique and well formed", () => {
  const seen = new Set();
  for (const r of uzc._records) {
    assert.ok(isValid(r.code), `${r.code} is malformed`);
    assert.ok(!seen.has(r.code), `${r.code} is duplicated`);
    seen.add(r.code);
  }
  assert.equal(seen.size, 42047);
});

test("round trips through PSGC", () => {
  for (const code of ["BC23023", "AB01001", "MM06002", "CE17999"]) {
    const r = uzc.get(code);
    if (r.psgc === "000000001" || r.psgc === "000000002") continue; // no PSGC assigned
    assert.equal(uzc.fromPsgc(r.psgc).code, code);
  }
});

test("PSGC lookup tolerates a stripped leading zero", () => {
  assert.equal(uzc.fromPsgc("31422023").code, "BC23023");
  assert.equal(uzc.fromPsgc("031422023").code, "BC23023");
});

test("lists barangays for a municipality by name or code", () => {
  const byName = uzc.barangays("San Rafael", "Bulacan");
  const byCode = uzc.barangays("BC23");
  assert.equal(byName.length, byCode.length);
  assert.ok(byName.length > 0);
  assert.ok(byName.every((r) => r.code.startsWith("BC23")));
});

test("searches by name", () => {
  const hits = uzc.search("Poblacion San Rafael");
  assert.ok(hits.some((r) => r.code === "BC23023"));
});

test("search returns the record directly for a code or a PSGC", () => {
  assert.deepEqual(uzc.search("BC23023").map((r) => r.code), ["BC23023"]);
  assert.deepEqual(uzc.search("031422023").map((r) => r.code), ["BC23023"]);
});

test("the two Cebu City entries outside the PSGC are still addressable", () => {
  const r = uzc.get("CE17999");
  assert.equal(r.municipality, "Cebu City");
  assert.equal(r.barangay, "North Reclamation Area");
});

test("rejects a payload that is not the published shape", () => {
  assert.throws(() => new UnifiedZipCode({}), TypeError);
  assert.throws(() => new UnifiedZipCode(null), TypeError);
});
