import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const portal = await readFile(new URL("../portal_core.html", import.meta.url), "utf8");
const auth = await readFile(new URL("../api/result-auth.js", import.meta.url), "utf8");

assert.match(portal, /class=["']ni central-management-only["']/);
assert.doesNotMatch(portal, /central-management-only[^\n]*results-management-only/);
assert.match(portal, /central-management-mode/);
assert.match(portal, /central_registry_management_allowed/);
assert.match(portal, /CURRENT_CENTRAL_MANAGEMENT_ALLOWED/);

assert.match(auth, /school_result_central_management_access/);
assert.match(auth, /central_registry_management_allowed:\s*payload\.central_registry_management_allowed\s*===\s*true/);
assert.match(auth, /return false/);

console.log("Result Central management visibility contract passed");

