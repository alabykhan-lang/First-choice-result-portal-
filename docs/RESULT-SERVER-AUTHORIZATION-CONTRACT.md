# Result Server Authorization Contract

**Status:** Phase 1 implementation, no cross-origin SSO redirects

This contract is the server-side boundary for the Result Portal. The browser may
request an operation, but the browser role, hidden controls, cached user object
and URL are never authorization evidence.

## Request flow

1. `POST /api/result-auth` with `action=login` sends the staff login to
   `school_identity_result_login`.
2. The server receives the opaque session secret once and sets a host-only,
   `HttpOnly`, `Secure`, `SameSite=Lax` cookie named `wts_result_session`.
3. The browser calls `POST /api/result-data` with an action and JSON payload.
4. The server extracts the cookie and calls `school_result_api`, or the narrow
   protected RPC for fees, configuration or settings reads.
5. The database validates the session, central person, employment, identity
   account, current Results grant, action permission and required scopes before
   changing Result data.

No session secret is returned to browser JavaScript, placed in a URL, or stored
in `localStorage`. Logout calls `school_identity_session_revoke` and clears the
cookie.

## Protected actions

| Portal action | Required permission | Scope/context |
| --- | --- | --- |
| `admin.users.read` | `users.manage` | active Result grant |
| `admin.invite.read` | `users.manage` | active Result grant |
| `admin.role.update` | `users.manage` | central identity remains authoritative |
| `admin.user.delete` | `users.manage` | hard deletion is rejected; deprovision in Registry |
| `admin.invite.rotate` | `users.manage` | server-generated code and audit event |
| `results.publish` | `results.publish` | academic session, term and class/subject scope |
| `scores.enter` | `scores.enter` or canonical result-entry permission | session, term, class and subject |
| `traits.enter` | `scores.enter` or canonical result-entry permission | session, term, class and subject |
| `remarks.enter` | `remarks.enter` or canonical result-entry permission | session, term, class and subject |
| `fees.update` | `results.manage` | active student/class and academic context |
| `students.upsert` | `results.manage` | server whitelist of mutable fields |
| `students.archive` | `results.manage` | soft archive; no destructive delete |
| `settings.read` | active Results grant | sensitive provider key excluded |
| `settings.app_config.update` | `results.manage` | provider key preserved server-side |
| `results.review` | `results.review` | class/subject scope when not broad management |
| `results.approve` | `results.approve` | class/subject scope when not broad management |
| `report_cards.generate` | `report_cards.generate` | class/subject scope when not broad management |
| `results.export` | `results.export` | class/subject scope when not broad management |

The requested permission names are mapped to the existing canonical catalog
names. This phase creates no permission grants and does not infer access from a
legacy `admin` string.

## Database entry points

- `school_identity_result_login`
- `school_identity_sessions`
- `school_identity_session_validate`
- `school_identity_session_revoke`
- `school_result_identity_resolve`
- `school_result_authorize`
- `school_result_api`
- `school_result_fees_update`
- `school_result_app_config_update`
- `school_result_settings_read`

The resolver and core authorizer are service-only database entry points. The
publicly callable RPCs require a session identifier and secret, and execute as
security-definer functions with a fixed search path. Direct access to the new
session table is denied and RLS is enabled.

## Failure behavior

The boundary denies access when the session is absent, expired, revoked or
audience-mismatched; the person, staff registration, employment or identity
account is inactive; the Results grant is absent or revoked; the Result user
mapping is missing or ambiguous; or a required class or subject scope is not
active. A teacher with no real scope assignment receives a restricted denial;
the system does not grant all classes by default.

## Transitional behavior

The legacy Result login remains for existing operational users. It is display
and compatibility state only and is not the new authorization boundary. New
first-password setup and self-registration are disabled. Existing direct reads
and several legacy writes remain until parity tests are complete; the remaining
operations are listed in `RESULT-SECURITY-MIGRATION-PLAN.md`.
