'use strict';

const {
  authStatus,
  requestOriginAllowed,
  sendJson,
  sessionFromRequest,
  setSecurityHeaders,
  supabaseRpc,
} = require('./_lib');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function wantsJson(req) {
  return String(req.headers.accept || '').toLowerCase().includes('application/json');
}

function emergencyPage(payload) {
  const requestId = escapeHtml(payload.request_id);
  const expiresAt = escapeHtml(payload.expires_at);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Protected Result Emergency Route</title>
  <style>
    :root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#14243d;background:#eef4f0}
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;box-sizing:border-box}
    main{width:min(680px,100%);padding:34px;background:#fff;border-top:5px solid #b8842f;box-shadow:0 18px 50px #14243d22}
    h1{margin:0 0 14px;font:500 clamp(32px,6vw,52px)/1 Georgia,serif}
    p{line-height:1.65;color:#4f5d6e}
    .warning{padding:16px;background:#fff7e8;border-left:4px solid #b8842f;color:#694d1f}
    a{display:inline-block;margin-top:18px;padding:12px 16px;background:#14243d;color:#fff;text-decoration:none;font-weight:700}
    small{display:block;margin-top:18px;color:#687687}
  </style>
</head>
<body>
  <main>
    <p><strong>PROTECTED TRANSITIONAL ROUTE</strong></p>
    <h1>Emergency legacy fallback.</h1>
    <p class="warning">This route is available only to an already authenticated WTS super administrator with active Central Registry management authority. Every use is audited. It is not a public login, registration or first-password setup route.</p>
    <p>The normal Result Portal uses the central WTS credential. Use this transitional route only when an authorised owner must recover an existing legacy operational session while the central credential rollout is completed.</p>
    <a href="/?emergency=1">Continue to the protected emergency view</a>
    <small>Audit request: ${requestId || 'recorded'} · Access window ends: ${expiresAt || 'shortly'}</small>
  </main>
</body>
</html>`;
}

module.exports = async function resultEmergency(req, res) {
  if (!requestOriginAllowed(req)) {
    sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const session = sessionFromRequest(req);
  if (!session) {
    sendJson(res, 401, { ok: false, code: 'RESULT_SESSION_REQUIRED' });
    return;
  }

  const payload = await supabaseRpc('school_identity_result_emergency_access', {
    p_session_id: session.sessionId,
    p_session_secret: session.sessionSecret,
  });
  if (!payload?.ok) {
    sendJson(res, authStatus(payload?.code), {
      ok: false,
      code: payload?.code || 'RESULT_EMERGENCY_ACCESS_DENIED',
    });
    return;
  }

  if (wantsJson(req)) {
    sendJson(res, 200, {
      ok: true,
      code: payload.code,
      legacy_enabled: true,
      request_id: payload.request_id,
      expires_at: payload.expires_at,
    });
    return;
  }

  setSecurityHeaders(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
  res.statusCode = 200;
  res.end(emergencyPage(payload));
};
