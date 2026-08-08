'use strict';

const {
  authStatus,
  bearerTokenFromRequest,
  readJsonBody,
  requestOriginAllowed,
  sendJson,
  supabaseRest,
} = require('./_lib');

const READ_RESOURCES = new Set([
  'classes', 'subjects', 'students', 'scores', 'traits', 'remarks', 'fees', 'published_subjects',
]);

function errorPayload(error) {
  const payload = error?.payload || {};
  return {
    ok: false,
    code: payload.code || 'RESULT_DATA_UNAVAILABLE',
    message: payload.message || payload.msg || error?.message || 'Result data is unavailable.',
  };
}

function filterParams(payload = {}) {
  const allowed = ['class_key', 'student_id', 'subject_index', 'term', 'academic_session', 'archived'];
  return allowed.reduce((query, key) => {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      query.set(key, `eq.${payload[key]}`);
    }
    return query;
  }, new URLSearchParams());
}

async function readResource(resource, payload, token) {
  if (!READ_RESOURCES.has(resource)) return [];
  const query = filterParams(payload);
  if (resource === 'students' && payload.archived === undefined) query.set('archived', 'eq.false');
  query.set('order', resource === 'students' ? 'created_at.asc' : 'created_at.asc');
  return supabaseRest(`${resource}?${query.toString()}`, {}, token);
}

async function readSettings(token) {
  const [configRows, contextRows] = await Promise.all([
    supabaseRest('app_config?id=eq.1&limit=1', {}, token),
    supabaseRest('academic_context?id=eq.1&limit=1', {}, token),
  ]);
  return {
    app_config: configRows?.[0]?.config || {},
    academic_context: contextRows?.[0] || {},
  };
}

async function upsert(table, body, token) {
  const rows = await supabaseRest(table, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body,
  }, token);
  return Array.isArray(rows) ? rows[0] || null : rows;
}

async function handleAction(action, payload, token) {
  if (action.startsWith('read.')) {
    return { ok: true, rows: await readResource(action.slice(5), payload, token) };
  }
  if (action.startsWith('history.')) {
    if (action === 'history.context.set') return { ok: true, read_only: true };
    return { ok: true, rows: [] };
  }
  if (action === 'context.set') {
    const context = await upsert('academic_context', {
      id: 1,
      class_key: payload.class_key || null,
      academic_session: payload.academic_session || null,
      term: payload.term || null,
      term_status: 'open',
    }, token);
    return { ok: true, context };
  }
  if (action === 'context.read') return { ok: true, context: (await readSettings(token)).academic_context };
  if (action === 'settings.read') return { ok: true, settings: await readSettings(token) };
  if (action === 'settings.app_config.update') {
    const config = await upsert('app_config', { id: 1, config: payload.config || {} }, token);
    return { ok: true, config };
  }
  if (action === 'students.upsert') {
    const student = await upsert('students', payload, token);
    return { ok: true, student };
  }
  if (action === 'students.archive') {
    const rows = await supabaseRest(`students?id=eq.${encodeURIComponent(payload.student_id)}`, {
      method: 'PATCH',
      body: { archived: true, archived_reason: payload.reason || null },
    }, token);
    return { ok: true, student: rows?.[0] || null };
  }
  if (action === 'scores.enter') {
    return { ok: true, score: await upsert('scores', payload, token) };
  }
  if (action === 'traits.enter') {
    return { ok: true, trait: await upsert('traits', payload, token) };
  }
  if (action === 'remarks.enter') {
    return { ok: true, remark: await upsert('remarks', payload, token) };
  }
  if (action === 'fees.update') {
    return { ok: true, fee: await upsert('fees', payload, token) };
  }
  if (action === 'results.publish') {
    if (payload.published === false) {
      await supabaseRest(`published_subjects?class_key=eq.${encodeURIComponent(payload.class_key)}&term=eq.${encodeURIComponent(payload.term)}&subject_index=eq.${encodeURIComponent(payload.subject_index)}&academic_session=eq.${encodeURIComponent(payload.academic_session)}`, {
        method: 'DELETE',
        prefer: 'return=minimal',
      }, token);
      return { ok: true, published: false };
    }
    return { ok: true, published_subject: await upsert('published_subjects', payload, token) };
  }
  // Export, analytics, and other non-persistent actions are handled by the UI.
  return { ok: true };
}

module.exports = async function resultData(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
    return;
  }
  if (!requestOriginAllowed(req)) {
    sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
    return;
  }
  const accessToken = bearerTokenFromRequest(req);
  if (!accessToken) {
    sendJson(res, 401, { ok: false, code: 'RESULT_SESSION_REQUIRED' });
    return;
  }
  const body = await readJsonBody(req);
  if (!body || typeof body.action !== 'string' || !body.action.trim()) {
    sendJson(res, 400, { ok: false, code: 'RESULT_ACTION_REQUIRED' });
    return;
  }
  try {
    const payload = await handleAction(body.action.trim(), body.payload || {}, accessToken);
    sendJson(res, 200, payload);
  } catch (error) {
    const payload = errorPayload(error);
    sendJson(res, authStatus(payload.code), payload);
  }
};
