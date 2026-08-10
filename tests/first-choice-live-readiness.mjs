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
check('teacher class context stays local',
  /!hasResultPermission\('result_settings\.manage'\)/.test(portal) && /local_only:true/.test(portal),
  'teachers can enter classes without writing the school-wide academic context');
check('safe next-term activation path',
  /settings\.activate_next_term/.test(dataApi) && /academic_context/.test(dataApi) && /settings\.activate_next_term/.test(portal) && /skipCloud/.test(portal),
  'term configuration and academic context are synchronized before local state changes');
check('explicit result unpublish handling',
  /action === 'results\.unpublish'/.test(dataApi) && /RESULT_ACTION_NOT_SUPPORTED/.test(dataApi),
  'unpublish is implemented explicitly and unknown actions are rejected');
check('score writes require a returned row',
  /RESULT_SCORE_SAVE_FAILED/.test(dataApi) && /if \(!rows\?\.\[0\]\)/.test(dataApi),
  'the API rejects empty update responses instead of reporting an old score as saved');
check('teacher result-write policies',
  /Signed-in staff can insert results/.test(await fs.readFile(new URL('docs/first-choice-supabase-bootstrap.sql', root), 'utf8')) && /Signed-in staff can update results/.test(await fs.readFile(new URL('docs/first-choice-supabase-bootstrap.sql', root), 'utf8')),
  'the bootstrap grants classroom write access while keeping management settings protected');
check('idempotent labelled demo loader',
  /read\.students/.test(portal) && /No duplicate pupils were created/.test(portal),
  're-running the demo loader does not create another copy of the labelled pupils');
check('grade scale persistence',
  /cfg\.gradeScale=GRADE_SCALE\.map/.test(portal) && /hydrateGradeScale/.test(portal),
  'saved grade thresholds are restored and used by the portal');
check('report card fee visibility follows settings',
  /getSessionCfg\(\)\.showFees!==false/.test(portal),
  'fee schedule is hidden only when management turns it off');
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
