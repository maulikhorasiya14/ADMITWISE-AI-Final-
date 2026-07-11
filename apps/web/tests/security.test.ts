import assert from "node:assert/strict";
import test from "node:test";
import { securityHeaders } from "../next.config.ts";

test("basic browser security headers are configured", () => {
  const headers = new Map(securityHeaders.map((header) => [header.key, header.value]));

  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.match(headers.get("Permissions-Policy") ?? "", /camera=\(\)/);
  assert.match(headers.get("Permissions-Policy") ?? "", /microphone=\(\)/);
});
