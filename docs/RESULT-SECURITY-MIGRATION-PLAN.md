# Result Security Migration Plan

## Completed in this phase

- Added central Result identity resolution and fail-safe mapping checks.
- Added central Result login without an SSO redirect.
- Added unique server-side Result sessions with expiry, last-seen and revocation
  fields; raw session secrets are hashed in the database.
- Added server-side permission and class/subject scope authorization.
- Added protected server routes for login, logout and Result actions.
- Routed central-session role administration, invite rotation, publishing,
  score, trait, remark, fee, student and app-config writes through protected
  RPCs.
- Rejected destructive Result user deletion; central deprovisioning is required.
- Revoked anonymous/authenticated direct writes to `user_profiles`,
  `invite_codes` and `published_subjects`.
- Disabled first-supplied legacy passwords and self-registration in the Result
  browser client.
- Added security headers and an explicit Origin allowlist for Result API routes.

## Still transitional

The following direct browser behavior remains and must be migrated with parity
tests before anonymous table writes can be revoked:

- legacy Result login still uses existing per-browser local password values for
  users who already have them;
- the legacy display session object remains in `localStorage` for compatibility,
  but it is no longer accepted as a central session and offline fallback is
  removed;
- Result reads for students, scores, traits, fees, remarks and published
  subjects still use the public Supabase Data API;
- legacy-mode score, trait, remark, fee, student and settings writes still use
  the existing browser path for production compatibility;
- report-card construction, printing and some exports remain client-side and
  need protected read adapters plus action checks;
- the legacy provider-key workflow remains separate from the central protected
  configuration path and must be redesigned before provider secrets are
  browser-available.

RLS is intentionally not enabled blindly in this phase. The existing Result
tables have live operational traffic and need protected-read parity first.

## Next migration sequence

1. Add protected Result read adapters for each existing query shape and compare
   response parity without changing data.
2. Move report-card generation and export reads behind `report_cards.generate`
   and `results.export` checks.
3. Add real class and subject scope assignments through Central Registry and
   verify denial for unassigned teachers.
4. Switch all central and then legacy-compatible writes to server routes.
5. Revoke remaining direct table writes and enable RLS with policy tests.
6. Remove legacy password/localStorage compatibility only after recovery and
   central credential readiness are proven.
