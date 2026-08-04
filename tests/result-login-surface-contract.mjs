import assert from "node:assert/strict";
import fs from "node:fs";

const portal = fs.readFileSync(new URL("../portal_core.html", import.meta.url), "utf8");
const emergency = fs.readFileSync(new URL("../api/result-emergency.js", import.meta.url), "utf8");

assert.match(portal, /WTS Staff Login/);
assert.match(portal, /Official email or staff number/);
assert.match(portal, /Sign In to WTS/);
assert.match(portal, /authorised school management/);
assert.doesNotMatch(portal, /id="tab-login"/);
assert.doesNotMatch(portal, /id="tab-register"/);
assert.doesNotMatch(portal, /id="form-register"/);
assert.doesNotMatch(portal, /function doRegister\s*\(/);
assert.match(portal, /EMERGENCY_LEGACY_ALLOWED/);
assert.match(portal, /localStorage\.removeItem\('wts_session'\)/);
assert.match(emergency, /school_identity_result_emergency_access/);
assert.match(emergency, /RESULT_EMERGENCY_ACCESS_DENIED/);
assert.match(emergency, /transitional/);

console.log("Result login surface contract passed");
