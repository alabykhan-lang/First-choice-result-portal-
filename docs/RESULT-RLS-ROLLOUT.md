# Result RLS Rollout

The Result Portal uses protected server-side APIs for all sensitive Result data.
The shared Supabase migration enables RLS table by table and removes browser
privileges from the legacy Result tables. The active policy is intentionally
deny-by-default; the server adapters enforce identity, employment, grant,
permission, class, subject, academic-session and term checks before reading or
writing data.

See the Central Registry migration directory for the per-table migrations and
`supabase/rollback/RESULT-RLS-ROLLBACK.sql` for the reviewed rollback reference.

RLS is not considered complete until the protected endpoint contract tests pass,
production row counts remain unchanged, and an authorised account completes the
non-destructive Result workflow. PKCE SSO remains blocked until those checks and
the Central Registry transitional operations are complete.
