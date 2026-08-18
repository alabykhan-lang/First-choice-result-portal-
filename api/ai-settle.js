'use strict';
const { bearerTokenFromRequest, readJsonBody, requestOriginAllowed, sendJson, supabaseRpc, supabaseRest } = require('./_lib');

function asConfig(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

async function sendCreditAlert(token, remaining, total, level) {
  if (!process.env.RESEND_API_KEY) return { sent: false, code: 'AI_EMAIL_NOT_CONFIGURED' };
  const rows = await supabaseRest('app_config?select=config&limit=1', {}, token).catch(() => []);
  const cfg = asConfig(rows?.[0]?.config);
  const to = String(cfg.aiAlertEmail || process.env.FIRST_CHOICE_AI_ALERT_EMAIL || 'amb.adigun002@gmail.com').trim();
  const from = String(process.env.FIRST_CHOICE_AI_ALERT_FROM || 'onboarding@resend.dev').trim();
  const subject = level === 'zero' ? 'First Choice AI credits have reached zero' : 'First Choice AI credits are running low';
  const message = level === 'zero'
    ? `AI scanning is now paused because the school wallet has reached 0 of ${total} credits. The ordinary result portal remains available. An administrator can restore credits from Settings → AI usage → AI Wallet Management.`
    : `The school has ${remaining} of ${total} AI credits remaining. AI scanning will soon pause; an administrator can restore credits from Settings → AI usage → AI Wallet Management.`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text: `${message}\n\nhttps://first-choice-result-portal.vercel.app` }),
  });
  if (!response.ok) return { sent: false, code: 'AI_EMAIL_SEND_FAILED' };
  return { sent: true };
}

module.exports = async function aiSettle(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' });
  if (!requestOriginAllowed(req)) return sendJson(res, 403, { ok: false, code: 'ORIGIN_NOT_ALLOWED' });
  const token = bearerTokenFromRequest(req);
  if (!token) return sendJson(res, 401, { ok: false, code: 'RESULT_SESSION_REQUIRED' });
  try {
    const body = await readJsonBody(req);
    if (!body?.ledger_id || !['succeeded', 'failed'].includes(body.status)) return sendJson(res, 400, { ok: false, code: 'AI_SETTLEMENT_INVALID' });
    const result = await supabaseRpc('ai_settle_credits', {
      p_ledger_id: body.ledger_id,
      p_status: body.status,
      p_input_tokens: 0,
      p_output_tokens: 0,
      p_billable_tokens: 0,
      p_credits_charged: body.status === 'succeeded' ? 1 : 0,
      p_error_code: body.status === 'failed' ? 'AI_RESULT_NOT_APPLIED' : null,
    }, token);
    if (result?.ok !== false && body.status === 'succeeded' && !result.replayed) {
      const walletRows = await supabaseRest('ai_wallets?select=free_credits,free_credits_used,paid_credits,paid_credits_used&limit=1', {}, token).catch(() => []);
      const wallet = walletRows?.[0];
      if (wallet) {
        const remaining = Math.max(0, Number(wallet.free_credits) - Number(wallet.free_credits_used) + Number(wallet.paid_credits) - Number(wallet.paid_credits_used));
        const total = Math.max(0, Number(wallet.free_credits) + Number(wallet.paid_credits));
        const lowThreshold = Math.max(100, Math.ceil(total * 0.1));
        const before = remaining + 1;
        const level = remaining === 0 && before > 0 ? 'zero' : remaining > 0 && remaining <= lowThreshold && before > lowThreshold ? 'low' : null;
        if (level) result.email_alert = await sendCreditAlert(token, remaining, total, level);
      }
    }
    return sendJson(res, result?.ok === false ? 400 : 200, result);
  } catch (error) {
    return sendJson(res, error.status || 500, { ok: false, code: 'AI_SETTLEMENT_FAILED', message: error.message });
  }
};
