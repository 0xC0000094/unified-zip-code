#!/usr/bin/env node
/**
 * Smoke test against a live deployment.
 *
 *   npm run smoke                          # https://zip.jamesventura.dev
 *   npm run smoke -- https://<preview-url>
 *
 * This exists because of an outage the unit tests could not see. A dependency
 * moved to devDependencies, the local build and all tests passed, and the
 * deployed function crashed on every request with ERR_MODULE_NOT_FOUND,
 * because Vercel prunes the runtime tree to production dependencies. Then the
 * fix redeployed against the broken build's cache and crashed the same way.
 * Nothing short of requesting the deployed artifact catches that class of
 * failure, so this script requests the deployed artifact.
 */

const base = (process.argv[2] ?? "https://zip.jamesventura.dev").replace(/\/$/, "");

let failures = 0;
async function get(path) {
  // One retry, for transport errors only. A bad HTTP status is a result, not
  // a reason to retry; a socket that never connected is noise.
  try {
    return await fetch(base + path, { headers: { accept: "application/json" } });
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    return fetch(base + path, { headers: { accept: "application/json" } });
  }
}

async function check(name, path, assertion) {
  try {
    const res = await get(path);
    await assertion(res);
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};

console.log(`Smoke test against ${base}`);

await check("app serves", "/", async (res) => {
  expect(res.status === 200, `status ${res.status}`);
  const html = await res.text();
  expect(html.includes("Unified ZIP Code"), "page body missing the title");
});

await check("lookup by code", "/api/lookup?code=BC23023", async (res) => {
  expect(res.status === 200, `status ${res.status}`);
  const body = await res.json();
  expect(body.ok === true, "ok is not true");
  expect(body.data.barangay === "Poblacion", `wrong record: ${body.data?.barangay}`);
});

await check("lookup by psgc", "/api/lookup?psgc=031422023", async (res) => {
  const body = await res.json();
  expect(body.data?.code === "BC23023", "psgc did not resolve");
});

await check("malformed input is 400", "/api/lookup?code=NOPE", async (res) => {
  expect(res.status === 400, `status ${res.status}`);
});

await check("unknown code is 404", "/api/lookup?code=ZZ99999", async (res) => {
  expect(res.status === 404, `status ${res.status}`);
});

await check("search returns malabon", "/api/search?q=malabon&limit=100", async (res) => {
  const body = await res.json();
  expect(body.count === 24, `count ${body.count}, expected 24`);
});

await check("provinces list", "/api/provinces", async (res) => {
  const body = await res.json();
  expect(body.count === 82, `count ${body.count}`);
  expect(res.headers.get("x-ratelimit-limit") === "60", "rate limit headers missing");
});

if (failures) {
  console.error(`\n${failures} check(s) failed against ${base}`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
