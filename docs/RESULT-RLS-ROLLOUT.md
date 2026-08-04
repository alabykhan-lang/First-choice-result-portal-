# Result RLS Rollout

The Result Portal uses protected server-side APIs for all sensitive Result data.
The shared Supabase migration enables RLS table by table and removes browser
privileges from the legacy Result tables. The active policy is intentionally
deny-by-default; the server adapters enforce identity, employment, grant,
permission, class, subject, academic-session and term checks before reading or
writing data.

See the Central Registry migration directory for the per-table migrations,
`result_boundary_hardening` for the final permission/legacy-authority gate, and
`supabase/rollback/RESULT-RLS-ROLLBACK.sql` plus
`supabase/rollback/RESULT-BOUNDARY-HARDENING-ROLLBACK.sql` for reviewed rollback
references.

## Live rollout record

The following Result tables are enabled with RLS and have no anonymous or
authenticated table privileges: `user_profiles`, `invite_codes`, `settings`,
`published_subjects`, `scores`, `remarks`, `traits`, `fees` and `students`.
Each has a deny-by-default browser policy; protected server adapters are the
approved read/write path. The live migration sequence is recorded by Supabase
under the table-specific `result_rls_*` versions and the final
`result_boundary_hardening` migration.

The final hardening migration did not add data, grants or scopes. It added only
permission definitions, session-native workspace access and fail-closed legacy
mutation guards.

RLS is not considered complete until the protected endpoint contract tests pass,
production row counts remain unchanged, and an authorised account completes the
non-destructive Result workflow. PKCE SSO remains blocked until those checks and
the Central Registry transitional operations are complete.
