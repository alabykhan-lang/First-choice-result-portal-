'use strict';

const {
  bearerTokenFromRequest,
  clearSessionCookie,
  readJsonBody,
  requestOriginAllowed,
  sendJson,
  supabaseAuthRequest,
} = require('./_lib');

function normalizeInvite(value) {
  return String(value || '').replace(/[\s,]+/g, '').toUpperCase();
}

function authError(res, error) {
  const payload = error?.payload || {};
  const message = String(payload.msg || payload.message || payload.error_description || '').toLowerCase();
  if (message.includes('invalid login credentials')) return sendJson(res, 401, { ok: false, code: 'INVALID_LOGIN_CREDENTIALS' });
  if (message.includes('email not confirmed')) return sendJson(res, 403, { ok: false, code: 'EMAIL_NOT_CONFIRMED' });
  if (message.includes('already registered') || message.includes('already been registered')) return sendJson(res, 409, { ok: false, code: 'EMAIL_ALREADY_REGISTERED' });
  sendJson(res, error?.status || 400, { ok: false, code: 'AUTH_REQUEST_FAILED', message: payload.msg || payload.message || 'Authentication failed.' });
}

module.exports = async function resultAuth(req, res) {
  if (!requestOriginAllowed(req)) return sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });

  if (req.method === 'GET') {
    const token = bearerTokenFromRequest(req);
    if (!token) return sendJson(res, 200, { ok: true, auth_mode: 'local', configured: true });
    try {
      const user = await supabaseAuthRequest('user', undefined, token);
      return sendJson(res, 200, { ok: true, auth_mode: 'local', user });
    } catch (error) {
      clearSessionCookie(res);
      return authError(res, error);
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  }
  const body = await readJsonBody(req);
  if (!body || typeof body.action !== 'string') return sendJson(res, 400, { ok: false, code: 'INVALID_JSON' });

  if (body.action === 'logout') return sendJson(res, 200, { ok: true, code: 'RESULT_LOGOUT_SUCCESS' });

  try {
    if (body.action === 'login') {
      const payload = await supabaseAuthRequest('token?grant_type=password', { email: body.email, password: body.password });
      return sendJson(res, 200, { ok: true, auth_mode: 'local', session: payload, user: payload.user });
    }
    if (body.action === 'register') {
      if (normalizeInvite(body.invite_code) !== 'AMBADIGUN') return sendJson(res, 403, { ok: false, code: 'INVITE_CODE_INVALID' });
      const payload = await supabaseAuthRequest('signup', { email: body.email, password: body.password, data: { portal: 'first_choice_result' } });
      return sendJson(res, 200, { ok: true, auth_mode: 'local', session: payload.access_token ? payload : null, user: payload.user || null });
    }
    if (body.action === 'forgot_password') {
      await supabaseAuthRequest('recover', { email: body.email, redirect_to: `${req.headers.origin || ''}/portal_core.html` });
      return sendJson(res, 200, { ok: true, code: 'PASSWORD_RECOVERY_SENT' });
    }
    return sendJson(res, 400, { ok: false, code: 'AUTH_ACTION_NOT_SUPPORTED' });
  } catch (error) {
    return authError(res, error);
  }
};
