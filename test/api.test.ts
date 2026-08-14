import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { _reset } from "../src/lib/rate-limit.ts";
import { GET as index } from "../src/pages/api/index.ts";
import { GET as lookup } from "../src/pages/api/lookup.ts";
import { GET as search } from "../src/pages/api/search.ts";
import { GET as provinces } from "../src/pages/api/provinces.ts";
import { GET as municipalities } from "../src/pages/api/municipalities.ts";
import { GET as barangays } from "../src/pages/api/barangays.ts";

beforeEach(() => _reset());

const call = (handler: any, path: string) =>
  handler({ request: new Request(`https://zip.jamesventura.dev${path}`) });

async function json(handler: any, path: string) {
  const res: Response = await call(handler, path);
  return { res, body: await res.json() };
}

test("lookup by code returns the record with rate limit headers", async () => {
  const { res, body } = await json(lookup, "/api/lookup?code=BC23023");
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.barangay, "Poblacion");
  assert.equal(body.data.municipality, "San Rafael");
  assert.equal(res.headers.get("x-ratelimit-limit"), "60");
  assert.ok(Number(res.headers.get("x-ratelimit-remaining")) < 60);
  assert.match(res.headers.get("cache-control") ?? "", /public/);
});

test("lookup by psgc tolerates a stripped leading zero", async () => {
  const { body } = await json(lookup, "/api/lookup?psgc=31422023");
  assert.equal(body.data.code, "BC23023");
});

test("malformed input is a 400, unknown input is a 404", async () => {
  const bad = await json(lookup, "/api/lookup?code=NOPE");
  assert.equal(bad.res.status, 400);
  assert.equal(bad.body.ok, false);
  assert.ok(bad.body.hint);
  const missing = await json(lookup, "/api/lookup?code=ZZ99999");
  assert.equal(missing.res.status, 404);
  const noparams = await json(lookup, "/api/lookup");
  assert.equal(noparams.res.status, 400);
  assert.match(noparams.res.headers.get("cache-control") ?? "", /no-store/);
});

test("search returns malabon's 24 and validates its inputs", async () => {
  const { body } = await json(search, "/api/search?q=malabon&limit=100");
  assert.equal(body.count, 24);
  const city = body.data.filter((r: any) => r.municipality === "Malabon City");
  assert.equal(city.length, 21);
  assert.equal(city.filter((r: any) => r.postal === "1470").length, 12);
  assert.equal((await call(search, "/api/search?q=")).status, 400);
  assert.equal((await call(search, "/api/search?q=x&limit=9999")).status, 400);
  assert.equal((await call(search, "/api/search?q=x&limit=0")).status, 400);
});

test("listings return the full sets", async () => {
  assert.equal((await json(provinces, "/api/provinces")).body.count, 82);
  const m = await json(municipalities, "/api/municipalities?province=Bulacan");
  assert.equal(m.body.count, 24);
  assert.equal((await call(municipalities, "/api/municipalities?province=Atlantis")).status, 404);
  const b = await json(barangays, "/api/barangays?municipality=BC23");
  assert.equal(b.body.count, 34);
  assert.ok(b.body.data.every((r: any) => r.code.startsWith("BC23")));
});

test("the index names all six endpoints", async () => {
  const { body } = await json(index, "/api");
  assert.equal(body.data.endpoints.length, 6);
  assert.equal(body.data.barangays, 42047);
});

test("the 61st request inside a minute is refused with retry-after", async () => {
  for (let i = 0; i < 60; i++) await call(provinces, "/api/provinces");
  const res: Response = await call(provinces, "/api/provinces");
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get("retry-after")) >= 1);
  const body = await res.json();
  assert.equal(body.ok, false);
});
