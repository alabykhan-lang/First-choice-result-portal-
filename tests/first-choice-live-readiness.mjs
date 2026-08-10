import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const portalUrl = process.env.RESULT_PORTAL_URL || 'https://first-choice-result-portal.vercel.app';
const root = new URL('..', import.meta.url);
const portal = await fs.readFile(new URL('portal_core.html', root), 'utf8');
const dataApi = await fs.readFile(new URL('api/result-data.js', root), 'utf8');
const authApi = await fs.readFile(new URL('api/result-auth.js', root), 'utf8');

const checks = [];
function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail });
  if (!passed) console.error(`FAIL  ${name}: ${detail}`);
  else console.log(`PASS  ${name}: ${detail}`);
}

check('three report-card templates',
  (portal.match(/id:\s*'(?:modern|creative|premium)'/g) || []).length === 3,
  'modern, creative and premium are defined');
check('dynamic CA selector',
  /assessment-ca-toggle/.test(portal) && /setAssessmentCaCount\(/.test(portal) && /\[1,2,3\]/.test(portal),
  '1, 2 and 3 CA choices are rendered by the client');
check('dynamic report-card CA columns',
  /Array\.from\(\{length:assessment\.caCount\}/.test(portal),
  'report cards derive CA columns from assessment.caCount');
check('protected data endpoint',
  /RESULT_SESSION_REQUIRED/.test(dataApi),
  'unauthenticated data requests are rejected');
check('management-only settings endpoint',
  /settings\.app_config\.update/.test(dataApi) && /requireManagement\(token\)/.test(dataApi),
  'management guard is present in the data API');
check('school administrator identity',
  /amb\.adigun002@gmail\.com/i.test(authApi),
  'official school administrator email is defined');

async function live(name, path, init, expected) {
  try {
    const response = await fetch(`${portalUrl}${path}`, { ...init, redirect: 'manual' });
    const body = await response.text();
    const ok = expected(response, body);
    check(name, ok, `HTTP ${response.status}`);
    return { status: response.status, body };
  } catch (error) {
    check(name, false, error.message);
    return null;
  }
}

await live('portal deployment responds', '/portal_core.html', { method: 'GET' }, (r) => r.status === 200);
await live('auth status responds', '/api/result-auth', { method: 'GET' }, (r) => r.status === 200);
await live('protected data rejects anonymous request', '/api/result-data', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'settings.read', payload: {} }),
}, (r) => r.status === 401);
await live('protected data rejects invalid origin', '/api/result-data', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://qa.invalid.example' }, body: JSON.stringify({ action: 'settings.read', payload: {} }),
}, (r) => r.status === 403 || r.status === 401);

const failed = checks.filter((item) => !item.passed);
console.log(JSON.stringify({ portalUrl, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
if (failed.length) process.exitCode = 1;
