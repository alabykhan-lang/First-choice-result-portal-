# Result Rollback Plan

This phase adds authorization functions, context-aware scope adapters, a
credential-management adapter, a session-cookie exchange route and Result
application routes. It does not copy, transform or delete Result records and
creates no sample records.

The additive database migrations are:

- `result_protected_reads_scopes_and_session_revocation`
- `result_api_grants_and_scope_management`
- `identity_credential_management_adapter`
- `central_session_cookie_adapters`
- `central_management_session_adapters`
- `result_permission_catalog_contract`
- `result_rls_user_profiles`
- `result_rls_invite_codes`
- `result_rls_settings`
- `result_rls_published_subjects`
- `result_rls_scores`
- `result_rls_remarks`
- `result_rls_traits`
- `result_rls_fees`
- `result_rls_students`
- `scope_privilege_cleanup`

## Application rollback

1. Stop central Result sign-in and protected writes through the deployment
   rollback mechanism.
2. Redeploy the last known-good Result build if an operational regression is
   confirmed.
3. Keep the database functions and session table in place while investigating;
   they are additive and do not change existing Result rows.
4. Do not restore direct account, invite or publish writes automatically. If an
   emergency compatibility release needs a grant restored, record approval,
   scope and expiry first.

## Database rollback

The reviewed table-level RLS rollback reference is maintained at
`central-registry/supabase/rollback/RESULT-RLS-ROLLBACK.sql`. It must only be
used for the affected table after confirming the protected deployment is
stopped. It is not a normal compatibility path and must not restore unrestricted
browser authority.

- Do not drop `school_identity_sessions` or the new functions as an immediate
  reaction. Existing active sessions must first be expired or revoked through a
  controlled server operation.
- The migration files are additive. A future down migration, if required, must
  be reviewed against live function dependencies and audit history.
- Never restore or expose password values, hashes or raw session secrets during
  rollback.
- Never hard-delete Result users or students as part of rollback. User removal
  remains a Central Registry deprovisioning operation; student removal remains
  an archive operation in the protected path.
- If the Central Registry frontend is rolled back, revoke any newly issued
  session rows through the existing session revocation path; do not expose the
  cookie secret or restore browser trust of roles.

## Verification after rollback

Check that the Result home page, class loading, score reads, existing report-card
generation and production data counts match the pre-release baseline. Run the
unauthenticated contract tests and confirm that no new session or audit rows
were created by the test run.
