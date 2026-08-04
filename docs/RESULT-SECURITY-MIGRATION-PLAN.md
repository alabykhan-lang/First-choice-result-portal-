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

The following items remain transitional:

- report-card markup and calculations remain client-side after protected reads;
  server-side action authorization is present, but a server-rendered report
  artifact is not yet implemented;
- Central Registry module/role management still uses its existing transitional
  records session for student/staff/guardian workflows; Result scope,
  credential and module-access management use session-native routes;
- provider-key/OCR processing requires a server-side provider configuration;
  browser provider secrets are no longer accepted.

RLS is applied per table through the Central Registry migrations after the
protected client boundary is deployed. No broad policy is used for an
unassigned teacher.

## Next migration sequence

1. Verify each live RLS migration and protected read/write route.
2. Complete session-native Central Registry records adapters.
3. Add real class and subject scope assignments through Central Registry and
   verify denial for unassigned teachers.
4. Run authorised real-account workflow verification without changing results.
5. Complete server-side provider configuration and report artifact review.
6. Re-audit the shared-domain cookie and begin PKCE only after every checklist
   item is passed.
