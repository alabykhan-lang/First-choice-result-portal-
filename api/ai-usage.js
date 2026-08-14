'use strict';
const { bearerTokenFromRequest, requestOriginAllowed, sendJson, supabaseAuthRequest, supabaseRest } = require('./_lib');

module.exports = async function aiUsage(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (!requestOriginAllowed(req)) return sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
  const token = bearerTokenFromRequest(req);
  if (!token) return sendJson(res, 401, { ok: false, code: 'RESULT_SESSION_REQUIRED' });
  try {
    const user = await supabaseAuthRequest('user', undefined, token);
    const profiles = await supabaseRest('staff_profiles?select=school_id&id=eq.' + encodeURIComponent(user.id) + '&limit=1', {}, token);
    // The profile query above is intentionally not used for authorization; RLS
    // scopes the wallet and ledger to the authenticated user's school.
    const schoolId = profiles?.[0]?.school_id;
    if (!schoolId) return sendJson(res, 403, { ok: false, code: 'RESULT_PERMISSION_DENIED' });
    const [wallet, usage] = await Promise.all([
      supabaseRest('ai_wallets?school_id=eq.' + encodeURIComponent(schoolId) + '&limit=1', {}, token),
      supabaseRest('ai_usage_ledger?school_id=eq.' + encodeURIComponent(schoolId) + '&select=id,user_id,operation,status,input_tokens,output_tokens,billable_tokens,credits_charged,created_at,completed_at&order=created_at.desc&limit=100', {}, token),
    ]);
    return sendJson(res, 200, { ok: true, wallet: wallet?.[0] || null, usage: usage || [] });
  } catch (error) {
    return sendJson(res, error.status || 500, { ok: false, code: error.payload?.code || 'AI_USAGE_UNAVAILABLE', message: error.message });
  }
};
