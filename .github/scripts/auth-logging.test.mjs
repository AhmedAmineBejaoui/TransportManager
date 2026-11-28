import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * Focused regression guard for the authentication cookie/session logging issue.
 * This is a static check, not a substitute for comprehensive security testing.
 */
const source = readFileSync(new URL("../../server/routes.ts", import.meta.url), "utf8");

function getAuthMiddleware() {
  const start = source.indexOf("function requireAuth(");
  const next = source.indexOf("function ", start + "function ".length);
  assert.ok(start !== -1, "requireAuth middleware must exist");
  return source.slice(start, next === -1 ? source.length : next);
}

test("requireAuth must not log authentication details", () => {
  const auth = getAuthMiddleware();
  assert.doesNotMatch(
    auth,
    /console\s*\.\s*(?:log|warn|info|debug|error)\s*\(/,
    "Never write authentication middleware internals to console logs",
  );
  assert.doesNotMatch(
    auth,
    /(?:req\.headers\.cookie|req\.get\(\s*["']cookie["']\s*\))/,
    "Do not inspect raw cookie values in requireAuth",
  );
});

test("session and bearer-token authentication paths remain present", () => {
  const auth = getAuthMiddleware();
  assert.match(auth, /req\.session\.userId/, "Session auth must remain available");
  assert.match(auth, /verifyJwt\(token\)/, "JWT auth must remain available");
  assert.match(auth, /next\(\)/, "Authenticated requests must still advance");
});
