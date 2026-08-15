# AI credit wallet rollout

This pilot bills at school level. All authenticated staff attached to the same `school_id` share one wallet; the ledger still records the staff user, operation, model, token counts, and outcome.

## Provisioning

1. Run [`ai-credit-wallet.sql`](./ai-credit-wallet.sql) in the First Choice Supabase project SQL editor.
2. Set the Vercel/server environment variable `FIRST_CHOICE_GEMINI_API_KEY` to the Gemini key. Never put it in `app_config`, HTML, browser storage, or a public environment variable.
3. Optionally set `FIRST_CHOICE_GEMINI_MODEL`; otherwise the API uses `gemini-3.1-flash-lite-preview`.
4. Seed paid credits from the management/controlled layer by updating the school wallet, for example `paid_credits = paid_credits + 1000`. Record the payment reference outside the AI ledger until online payments are introduced.

The initial wallet includes 100 free credits. For the pilot, one successful OCR job consumes one internal credit and a failed call consumes nothing. Provider token metadata is still recorded privately for later cost review, but it does not change the customer's bill yet. The rest of the portal remains usable at zero AI balance.

## Simple pilot packages

Use a simple linear package model while real school usage is being observed:

| Payment | School AI credits |
| --- | ---: |
| ₦5,000 | 1,000 |
| ₦10,000 | 2,000 |
| ₦15,000 | 3,000 |
| ₦20,000 | 4,000 |

One credit is charged only when the OCR result is successfully applied to the portal. A failed extraction, cancelled scan, or result that is not applied is not charged. The fifth successful application counts like every other successful application; there is no token-based customer meter in this pilot.

The Settings dashboard displays remaining balance as a percentage bar: 100% means the school has its full approved allowance, and 0% means AI scanning is stopped while the ordinary portal remains available. Managers can click a package to create a pending request. The dashboard then shows “Waiting for developer confirmation”; no credits are added until the developer confirms the payment and credits the school wallet.

For the manual pilot, confirm a request in the controlled Supabase layer by reviewing `ai_credit_pack_requests`, setting its `status` to `approved`, and adding `credits_requested` to that school's `ai_wallets.paid_credits` in the same controlled operation. Set `reviewed_at` and an optional `review_note`. The manager will see the updated balance after refreshing the dashboard.

The first payment workflow is intentionally manual: the portal shows the shared balance and a “Contact developer to renew” mail action. Paystack/Flutterwave can be added later without changing the token ledger contract.

When configured, the server sends one low-balance email when the wallet crosses 10% or 100 credits remaining (whichever threshold is higher), and one zero-balance email when scanning stops. The administrator recipient is set in Settings → AI usage → AI Email Alerts. Delivery requires the server-only `RESEND_API_KEY` and, for production sending, a verified `FIRST_CHOICE_AI_ALERT_FROM` address.

## Management reset

School administrators and the developer can open Settings → AI usage → AI Wallet Management, enter the free and paid allowance, and choose “Reset wallet counters”. This sets the allowance, clears the used counters, and preserves the usage ledger for audit history. Teachers cannot see or call this action.

## Zero-balance behavior

When the remaining balance reaches zero, the reserve function returns `AI_CREDITS_EXHAUSTED`; no ledger reservation or charge is created. OCR is blocked with a renewal message, while ordinary classes, scores, reports, settings, and navigation remain available. A manager can restore the allowance from the management reset panel without coding.
