# Result Portal Integration Plan

The School Platform remains the public website and future WTS Workspace
entrance. The Result Portal remains a separate application and repository. This
phase establishes a server-side Result authorization boundary without merging
repositories, using iframes or implementing SSO redirects.

## Current integration boundary

- Central Registry owns people, staff status, credentials, grants and scopes.
- The Result Portal resolves its existing `user_profiles` record through the
  confirmed central person mapping.
- Result server functions revalidate central identity and the Results grant for
  each protected action.
- The browser receives only display data and a host-only HttpOnly session cookie.
- Attendance and Notification are deliberately unchanged in this phase.
- Central-auth Result reads and writes now pass through the protected Result
  route; legacy compatibility mode remains isolated and is not an SSO contract.
- Central Registry has a context-aware Result scope UI, audited credential
  activation/recovery and session-native management routes. Result scope and
  credential management use host-only HttpOnly sessions. School Platform
  workspace sign-in also uses a server-side session cookie and does not store
  opaque client credentials in browser storage.
- The Result Portal has no browser role or invite authority. Central Registry is
  the only management surface for real staff grants, class scopes and subject
  scopes.
- Central Registry management visibility is now server-derived and fail-closed:
  the Result link requires a validated canonical Central Registry management
  permission, and the Central Registry session route repeats that check for
  direct URL access.

## Future module navigation

The workspace should show Results, Registry, Attendance, Notifications and other
modules only from current grants. Opening a module is a navigation decision;
the specialist application remains the final authorization boundary.

The likely production topology is one subdomain per application. DNS and Vercel
configuration should be completed before SSO testing, with explicit allowlists
for every sensitive cross-origin endpoint.

## Recommended order

1. Complete non-destructive Result protected-read parity and real-account
   workflow verification. **Completed for this phase.**
2. Verify Central Registry credential recovery and make only real Result scope
   assignments through management approval. **Management controls completed;
   no assignment was invented.**
3. Integrate Results into the Workspace through a short-lived authorization
   code handoff, preferably PKCE-bound and server exchanged.
4. Audit and harden Registry before making it a target of the same handoff.
5. Complete separate Attendance and Notification operational/security reviews.
6. Extend the contract to those systems only after their identity mappings and
   provider/device flows are proven.

