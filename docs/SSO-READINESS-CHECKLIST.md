# SSO Readiness Checklist

**Current decision:** not ready for PKCE or cross-origin SSO redirects.

## Required before SSO

- [ ] Central credential recovery and compulsory password-change flow is
  complete for all real staff accounts.
- [ ] Every active Results user has exactly one verified central person mapping.
- [ ] Management has assigned real class and subject scopes where required.
- [ ] Protected Result reads have parity tests for students, scores, traits,
  fees, remarks and published subjects.
- [ ] Report-card generation and export perform server-side action checks.
- [ ] Remaining legacy writes and unrestricted Data API reads are migrated or
  protected by tested RLS policies.
- [ ] Attendance and Notification are not included in the SSO rollout until
  their own identity and provider readiness reviews are complete.
- [ ] Logout, grant revocation, staff suspension and session revocation have
  cross-application tests.

## URL and browser requirements

Future hosts are expected to be:

- `portal.waytosuccessschools.com`
- `results.waytosuccessschools.com`
- `registry.waytosuccessschools.com`
- `attendance.waytosuccessschools.com`
- `notify.waytosuccessschools.com`

The Result cookie is currently host-only and does not cross these hosts. A
shared parent-domain cookie must not be introduced until its scope, theft
impact, `Secure`, `HttpOnly`, `SameSite` and CSRF controls are reviewed. API
routes must use explicit Origin allowlists; wildcard credentialed CORS is not
acceptable.

The preferred future handoff is a short-lived, single-use authorization code
with PKCE or an equivalent server-to-server exchange. The code must be stored
hashed, bound to the target audience and redirect URI, expire quickly, and be
redeemed only once. Raw reusable session secrets must never appear in URLs.

## Direct module visits

After readiness approval, a direct visit to a specialist module should redirect
to central authentication when no valid local session exists. The specialist
application must still validate the resulting central identity and its current
grant; a redirect alone is not authorization.
