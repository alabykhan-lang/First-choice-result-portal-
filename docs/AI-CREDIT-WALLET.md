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

The first payment workflow is intentionally manual: the portal shows the shared balance and a “Contact developer to renew” mail action. Paystack/Flutterwave can be added later without changing the token ledger contract.
