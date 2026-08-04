# Result Security Migration Plan

## Completed in this phase

- Added central Result identity resolution and fail-safe mapping checks.
- Added central Result login without an SSO redirect.
- Added unique server-side Result sessions with expiry, last-seen and revocation
  fields; raw session secrets are hashed in the database.
- Added server-side permission and class/subject scope authorization.
- Added protected server routes for login, logout and Result actions.
- Added protected Result read adapters for students, classes, subjects, scores,
  traits, remarks, fees, published subjects, summaries and report-card source
  data.
- Added explicit report-card generation and export authorization checks before
  protected browser rendering/download workflows.
- Added context-aware class/subject assignment adapters and management UI in
  Central Registry.
- Added Central Registry credential activation/recovery UI using the audited
  temporary-credential routine through a session-native management adapter.
- Added a server-side Central Registry session exchange foundation using the
  Phase 1 session table and an HttpOnly cookie. Result scope reads/writes and
  credential issuance now use session-native adapters; older module and role
  management RPCs remain transitional.
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
- legacy-mode reads and score, trait, remark, fee, student and settings writes
  still use the existing browser path for production compatibility;
- report-card markup and calculations remain client-side after protected reads;
  server-side action authorization is present, but a server-rendered report
  artifact is not yet implemented;
- Central Registry module/role management still uses its existing transitional
  admin-client RPC session; Result scope and credential writes have moved to
  session-native management routes.
- the legacy provider-key workflow remains separate from the central protected
  configuration path and must be redesigned before provider secrets are
  browser-available.

RLS is intentionally not enabled blindly in this phase. The existing Result
tables have live operational traffic and need protected-read parity first.

## Next migration sequence

1. Complete parity coverage for each protected Result read shape without
   changing data.
2. Move remaining legacy Result reads and writes behind the same adapters.
3. Complete session-native Central Registry module, role and identity-read
   management adapters.
4. Add real class and subject scope assignments through Central Registry and
   verify denial for unassigned teachers.
5. Switch all central and then legacy-compatible writes to server routes.
6. Revoke remaining direct table writes and enable RLS with policy tests.
7. Remove legacy password/localStorage compatibility only after recovery and
   central credential readiness are proven.

