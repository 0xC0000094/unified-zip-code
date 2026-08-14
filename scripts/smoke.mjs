#!/usr/bin/env node
/**
 * Smoke test against a live deployment.
 *
 *   npm run smoke                          # https://zip.jamesventura.dev
 *   npm run smoke -- https://<preview-url>
 *
 * This exists because of two failures the unit tests could not see.
 *
 * First, a function that crashed at invocation while every test passed: the
 * deployed artifact was broken in ways no local check exercises, so this
 * script requests the deployed artifact.
 *
 * Second, a test run that passed against the vercel.app alias while the real
 * domain was unreachable: testing a stand-in hostname proves nothing about the
 * one visitors use. So this script resolves the target domain through public
 * DNS (DNS over HTTPS, bypassing whatever the local resolver believes),
 * connects to the resolved address directly, and validates the TLS
 * certificate for the domain as part of the suite. If DNS points at a parking
 * server or the certificate is wrong, the run fails loudly instead of quietly
 * testing the wrong thing.
 */

import https from "node:https";

const base = new URL(process.argv[2] ?? "https://zip.jamesventura.dev");
const host = base.hostname;

let failures = 0;
const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};

/** Resolve through public DNS, not the local resolver. */
async function resolveHost(name) {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${name}&type=A`,
    { headers: { accept: "application/dns-json" } },
  );
  const body = await res.json();
  const ips = (body.Answer ?? []).filter((a) => a.type === 1).map((a) => a.data);
  expect(ips.length > 0, `public DNS returned no A records for ${name}`);
  return ips;
}

/**
 * Request a path from a specific IP with SNI for the real hostname. TLS is
 * validated against the hostname, so a parking server or a wrong certificate
 * fails here rather than passing unseen.
 */
function get(ip, path) {
  return new Promise((resolvePromise, reject) => {
    const req = https.request(
      {
        host: ip,
        servername: host,
        path,
        headers: { host, accept: "application/json" },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolvePromise({ status: res.statusCode, body: data, headers: res.headers }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("timed out")));
    req.on("error", reject);
    req.end();
  });
}

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL  ${name}: ${err.message}`);
  }
}

console.log(`Smoke test against https://${host}`);

let ips = [];
await check("public DNS resolves the domain", async () => {
  ips = await resolveHost(host);
  console.log(`        -> ${ips.join(", ")}`);
});

if (ips.length === 0) {
  console.error(`\nCannot continue without DNS. ${failures} check(s) failed.`);
  process.exit(1);
}
const ip = ips[0];

await check("TLS certificate is valid for the domain", async () => {
  // https.request validates the chain and the name against servername; a
  // successful response IS the assertion. A parking server dies here.
  const res = await get(ip, "/");
  expect(res.status === 200, `status ${res.status}`);
  expect(res.body.includes("Unified ZIP Code"), "page body missing the title");
});

const json = async (path) => {
  const res = await get(ip, path);
  let parsed;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    throw new Error(`status ${res.status}, body is not JSON`);
  }
  return { res, body: parsed };
};

await check("lookup by code", async () => {
  const { res, body } = await json("/api/lookup?code=BC23023");
  expect(res.status === 200, `status ${res.status}`);
  expect(body.ok === true, "ok is not true");
  expect(body.data.barangay === "Poblacion", `wrong record: ${body.data?.barangay}`);
});

await check("lookup by psgc", async () => {
  const { body } = await json("/api/lookup?psgc=031422023");
  expect(body.data?.code === "BC23023", "psgc did not resolve");
});

await check("malformed input is 400", async () => {
  const { res } = await json("/api/lookup?code=NOPE");
  expect(res.status === 400, `status ${res.status}`);
});

await check("unknown code is 404", async () => {
  const { res } = await json("/api/lookup?code=ZZ99999");
  expect(res.status === 404, `status ${res.status}`);
});

await check("search returns malabon", async () => {
  const { body } = await json("/api/search?q=malabon&limit=100");
  expect(body.count === 24, `count ${body.count}, expected 24`);
});

await check("provinces list with rate limit headers", async () => {
  const { res, body } = await json("/api/provinces");
  expect(body.count === 82, `count ${body.count}`);
  expect(res.headers["x-ratelimit-limit"] === "60", "rate limit headers missing");
});

if (failures) {
  console.error(`\n${failures} check(s) failed against https://${host}`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
