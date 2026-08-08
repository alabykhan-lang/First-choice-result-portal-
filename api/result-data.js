'use strict';

const {
  authStatus,
  bearerTokenFromRequest,
  readJsonBody,
  requestOriginAllowed,
  sendJson,
  supabaseRpc,
} = require('./_lib');

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
  const session = { sessionId: null, sessionSecret: null };
  const authenticatedRpc = (name, payload) => supabaseRpc(name, payload, accessToken);

  const body = await readJsonBody(req);
  if (!body || typeof body.action !== 'string' || !body.action.trim()) {
    sendJson(res, 400, { ok: false, code: 'RESULT_ACTION_REQUIRED' });
    return;
  }

  const action = body.action.trim();
  const requestPayload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  const payload = action.startsWith('read.')
    ? await authenticatedRpc('school_result_read_api', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_resource: action.slice('read.'.length),
        p_payload: requestPayload,
      })
    : action === 'scores.enter'
      ? await authenticatedRpc('school_result_score_update', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_student_id: requestPayload.student_id || null,
        p_class_key: requestPayload.class_key || null,
        p_subject_index: requestPayload.subject_index === '' || requestPayload.subject_index === undefined ? null : requestPayload.subject_index,
        p_term: requestPayload.term || null,
        p_academic_session: requestPayload.academic_session || null,
        p_ca1: requestPayload.ca1 === '' || requestPayload.ca1 === undefined ? null : requestPayload.ca1,
        p_ca2: requestPayload.ca2 === '' || requestPayload.ca2 === undefined ? null : requestPayload.ca2,
        p_ca3: requestPayload.ca3 === '' || requestPayload.ca3 === undefined ? null : requestPayload.ca3,
        p_exam: requestPayload.exam === '' || requestPayload.exam === undefined ? null : requestPayload.exam,
      })
    : action === 'traits.enter'
      ? await authenticatedRpc('school_result_traits_update', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_student_id: requestPayload.student_id || null,
        p_class_key: requestPayload.class_key || null,
        p_term: requestPayload.term || null,
        p_academic_session: requestPayload.academic_session || null,
        p_trait_type: requestPayload.trait_type || null,
        p_trait_name: requestPayload.trait_name || null,
        p_rating: requestPayload.rating === '' || requestPayload.rating === undefined ? null : requestPayload.rating,
      })
      : action === 'remarks.enter'
        ? await authenticatedRpc('school_result_remarks_update', {
          p_session_id: session.sessionId,
          p_session_secret: session.sessionSecret,
          p_student_id: requestPayload.student_id || null,
          p_class_key: requestPayload.class_key || null,
          p_term: requestPayload.term || null,
          p_academic_session: requestPayload.academic_session || null,
          p_academic: requestPayload.academic ?? null,
          p_form_master: requestPayload.form_master ?? null,
          p_principal: requestPayload.principal ?? null,
          p_days_opened: requestPayload.days_opened === '' || requestPayload.days_opened === undefined ? null : requestPayload.days_opened,
          p_days_present: requestPayload.days_present === '' || requestPayload.days_present === undefined ? null : requestPayload.days_present,
        })
        : action === 'fees.update'
    ? await authenticatedRpc('school_result_fees_update', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_student_id: requestPayload.student_id || null,
        p_class_key: requestPayload.class_key || null,
        p_term: requestPayload.term || null,
        p_academic_session: requestPayload.academic_session || null,
        p_total: requestPayload.total === '' || requestPayload.total === undefined ? null : requestPayload.total,
        p_paid: requestPayload.paid === '' || requestPayload.paid === undefined ? null : requestPayload.paid,
        p_debt: requestPayload.debt === '' || requestPayload.debt === undefined ? null : requestPayload.debt,
      })
    : action === 'context.set'
      ? await authenticatedRpc('school_result_context_set', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_class_key: requestPayload.class_key || null,
        p_academic_session: requestPayload.academic_session || null,
        p_term: requestPayload.term || null,
      })
    : action === 'context.read'
      ? await authenticatedRpc('school_result_context_read', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
      })
    : action === 'settings.app_config.update'
      ? await authenticatedRpc('school_result_app_config_update', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_config: requestPayload.config && typeof requestPayload.config === 'object' ? requestPayload.config : {},
      })
    : action === 'settings.read'
    ? await authenticatedRpc('school_result_settings_read', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
      })
    : action === 'history.context.set'
      ? await authenticatedRpc('school_result_history_context_set', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_class_key: requestPayload.class_key || null,
        p_academic_session: requestPayload.academic_session || null,
        p_term: requestPayload.term || null,
      })
    : action.startsWith('history.')
      ? await authenticatedRpc('school_result_history_read', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_action: action.slice('history.'.length),
        p_payload: requestPayload,
      })
    : await authenticatedRpc('school_result_api', {
        p_session_id: session.sessionId,
        p_session_secret: session.sessionSecret,
        p_action: action,
        p_payload: requestPayload,
      });
  if (!payload?.ok) {
    sendJson(res, authStatus(payload?.code), payload || { ok: false, code: 'RESULT_REQUEST_FAILED' });
    return;
  }
  sendJson(res, 200, payload);
};
