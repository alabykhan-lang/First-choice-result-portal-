# Result Production Verification

## Baseline

The live pre-RLS baseline was captured without changing records:

| Record set | Count |
| --- | ---: |
| Students | 798 |
| Scores | 14303 |
| Traits | 17520 |
| Remarks | 757 |
| Fees | 757 |
| Published subjects | 300 |
| Result profiles | 25 |
| Invite codes | 1 |
| Active Result grants | 25 |
| Active Result scopes | 0 |

## Automated checks

- Result protected endpoint rejects a request without the Result session.
- Result protected endpoint rejects an unapproved Origin.
- Result client JavaScript parses successfully.
- Browser legacy boundary scan confirms no active Supabase Data API helper,
  Base64 password comparison or trusted localStorage Result session write.
- Existing production pages and protected API deployment remain available.
- Direct anonymous REST reads for all nine migrated tables returned HTTP 401.
- RLS is enabled with one deny policy per migrated table and no anonymous table
  `SELECT`, `INSERT`, `UPDATE` or `DELETE` privilege.
- Post-migration counts exactly match the baseline above.

## Not performed

No positive credential activation, score write, publishing change, revocation
mutation or real-account password change was performed. Those operations would
modify production identity or academic state and require an authorised account
and an approved reversible test window. Real-account end-to-end verification is
still a prerequisite for PKCE SSO.
