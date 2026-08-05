'use strict';

const {
  clearSessionCookie,
  readJsonBody,
  requestOriginAllowed,
  sendJson,
  sessionFromRequest,
  setSessionCookie,
  supabaseRpc,
} = require('./_lib');

function safeLoginResponse(payload) {
  return {
    ok: true,
    code: payload.code,
    auth_mode: 'central',
    expires_at: payload.expires_at,
    person: payload.person,
    result_user: payload.result_user,
    access_role: payload.access_role,
    permissions: payload.permissions,
    central_registry_management_allowed: payload.central_registry_management_allowed === true,
  };
}

async function centralManagementAccess(sessionId, sessionSecret) {
  try {
    const payload = await supabaseRpc('school_result_central_management_access', {
      p_session_id: sessionId,
      p_session_secret: sessionSecret,
    });
    return payload?.ok === true && payload.central_registry_management_allowed === true;
  } catch {
    return false;
  }
}

module.exports = async function resultAuth(req, res) {
  if (!requestOriginAllowed(req)) {
    sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
    return;
  }

  if (req.method === 'GET') {
    const session = sessionFromRequest(req);
    if (!session) {
      clearSessionCookie(res);
      sendJson(res, 401, { ok: false, code: 'RESULT_SESSION_REQUIRED' });
      return;
    }
    const payload = await supabaseRpc('school_result_api', {
      p_session_id: session.sessionId,
      p_session_secret: session.sessionSecret,
      p_action: 'identity.context',
      p_payload: {},
    });
    if (!payload?.ok) {
      clearSessionCookie(res);
      sendJson(res, 401, payload || { ok: false, code: 'RESULT_SESSION_NOT_ACTIVE' });
      return;
    }
    const centralRegistryManagementAllowed = await centralManagementAccess(session.sessionId, session.sessionSecret);
    sendJson(res, 200, {
      ...payload,
      auth_mode: 'central',
      central_registry_management_allowed: centralRegistryManagementAllowed,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const body = await readJsonBody(req);
  if (!body) {
    sendJson(res, 400, { ok: false, code: 'INVALID_JSON' });
    return;
  }

  if (body.action === 'logout') {
    const session = sessionFromRequest(req);
    if (session) {
      await supabaseRpc('school_identity_session_revoke', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_reason: 'RESULT_PORTAL_LOGOUT',
      });
    }
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true, code: 'RESULT_LOGOUT_SUCCESS' });
    return;
  }

  if (body.action === 'change_password') {
    const login = typeof body.login === 'string' ? body.login.trim() : '';
    const currentPassword = typeof body.current_password === 'string' ? body.current_password : '';
    const newPassword = typeof body.new_password === 'string' ? body.new_password : '';
    if (!login || !currentPassword || !newPassword) {
      sendJson(res, 400, { ok: false, code: 'PASSWORD_CHANGE_INPUT_REQUIRED' });
      return;
    }
    const payload = await supabaseRpc('school_identity_change_password', {
      p_login: login,
      p_current_password: currentPassword,
      p_new_password: newPassword,
    });
    sendJson(res, payload?.ok ? 200 : 400, payload);
    return;
  }

  if (body.action !== 'login') {
    sendJson(res, 400, { ok: false, code: 'AUTH_ACTION_NOT_SUPPORTED' });
    return;
  }

  const login = typeof body.login === 'string' ? body.login.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!login || !password) {
    sendJson(res, 400, { ok: false, code: 'LOGIN_AND_PASSWORD_REQUIRED' });
    return;
  }

  const payload = await supabaseRpc('school_identity_result_login', {
    p_login: login,
    p_password: password,
  });
  if (!payload?.ok) {
    const status = payload?.code === 'PASSWORD_CHANGE_REQUIRED' ? 428 : 401;
    sendJson(res, status, payload || { ok: false, code: 'INVALID_LOGIN' });
    return;
  }

  if (!payload.session_id || !payload.session_secret) {
    sendJson(res, 503, { ok: false, code: 'RESULT_SESSION_ISSUE_FAILED' });
    return;
  }
  const centralRegistryManagementAllowed = await centralManagementAccess(payload.session_id, payload.session_secret);
  setSessionCookie(res, payload.session_id, payload.session_secret);
  sendJson(res, 200, safeLoginResponse({
    ...payload,
    central_registry_management_allowed: centralRegistryManagementAllowed,
  }));
};

