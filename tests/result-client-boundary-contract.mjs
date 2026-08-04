import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../portal_core.html", import.meta.url), "utf8");

assert.equal(/supabase\.co|\/rest\/v1|supabase-js/i.test(source), false, "Result browser source contains a direct Supabase boundary");
assert.equal(/localStorage|wts_pw_|wts_session|base64 browser password/i.test(source), false, "Result browser source retains legacy browser authority");
assert.equal(/Legacy Login|\bRegister\b|self-registration|first-password browser setup/i.test(source), false, "Result browser source retains a legacy authentication surface");
assert.equal(/id=["']page-admin["']|loadAdminPanel|invite_codes|user_profiles/i.test(source), false, "Result browser source retains legacy administration UI");
assert.match(source, /WTS Staff Number or Official Email/);
assert.match(source, /\/api\/result-auth/);
assert.match(source, /\/api\/result-data/);

console.log("Result client protected-boundary contract passed");
