import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, clientIp, _reset } from "../src/lib/rate-limit.ts";

beforeEach(() => _reset());

const req = (headers: Record<string, string> = {}) =>
  new Request("https://zip.jamesventura.dev/api/provinces", { headers });

test("allows up to the limit and then refuses", () => {
  const now = Date.now();
  for (let i = 1; i <= 60; i++) {
    const r = rateLimit("1.1.1.1", now);
    assert.equal(r.allowed, true, `request ${i} should be allowed`);
    assert.equal(r.remaining, 60 - i);
  }
  const over = rateLimit("1.1.1.1", now);
  assert.equal(over.allowed, false);
  assert.equal(over.remaining, 0);
  assert.ok(over.retryAfter >= 1);
});

test("the window slides, so the bucket frees up", () => {
  const now = Date.now();
  for (let i = 0; i < 60; i++) rateLimit("2.2.2.2", now);
  assert.equal(rateLimit("2.2.2.2", now).allowed, false);
  assert.equal(rateLimit("2.2.2.2", now + 60_001).allowed, true);
});

test("addresses are counted separately", () => {
  const now = Date.now();
  for (let i = 0; i < 60; i++) rateLimit("3.3.3.3", now);
  assert.equal(rateLimit("3.3.3.3", now).allowed, false);
  assert.equal(rateLimit("4.4.4.4", now).allowed, true);
});

test("takes the left-most address from x-forwarded-for", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": "9.9.9.9, 10.0.0.1, 10.0.0.2" })), "9.9.9.9");
  assert.equal(clientIp(req({ "x-forwarded-for": " 9.9.9.9 " })), "9.9.9.9");
  assert.equal(clientIp(req({ "x-real-ip": "8.8.8.8" })), "8.8.8.8");
});

test("an unknown caller shares one bucket rather than escaping the limit", () => {
  assert.equal(clientIp(req()), "unknown");
  const now = Date.now();
  for (let i = 0; i < 60; i++) rateLimit("unknown", now);
  assert.equal(rateLimit("unknown", now).allowed, false);
});
