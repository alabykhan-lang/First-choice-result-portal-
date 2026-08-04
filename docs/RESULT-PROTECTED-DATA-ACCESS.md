# Result Protected Data Access

**Status:** Protected data boundary preserved; Phase 3/RLS/PKCE work paused

## Request boundary

Central-auth Result browser requests use `POST /api/result-data`. The route
reads the host-only `HttpOnly; Secure; SameSite=Lax` Result cookie and forwards
only an allowlisted action to a guarded database function. The browser role,
localStorage object, hidden control or URL is not authorization evidence.

## Protected reads

`read.students`, `read.classes`, `read.subjects`, `read.scores`,
`read.traits`, `read.remarks`, `read.fees`, `read.published_subjects`,
`read.result_summary` and `read.report_card` resolve through
`school_result_read_api`.

The adapter filters by the supplied class, student, subject, academic session
and term. It returns only selected columns and excludes archived students from
active reads. It requires a valid session, active person and staff record,
active employment, active identity account, active Results grant, the required
permission and applicable class/subject scope.

## Protected writes

Central-auth writes use these server-side actions:

- `scores.enter` -> `school_result_api`
- `traits.enter` -> `school_result_traits_update`
- `remarks.enter` -> `school_result_remarks_update`
- `fees.update` -> `school_result_fees_update`
- `students.upsert` and `students.archive` -> `school_result_api`
- `results.publish` -> `school_result_api`
- `settings.app_config.update` -> `school_result_app_config_update`
- `settings.read` -> `school_result_settings_read`
- Result administration actions -> `school_result_api`

Writes validate academic session and term where applicable, check student/class
membership, enforce numeric ranges and record Result audit events. Student
removal is a soft archive; hard deletion is not exposed by the protected path.

## Report cards and exports

`report_cards.generate` is checked before card data is loaded. `results.export`
is checked before broadsheets, progress reports, analytics, subject awards and
backup downloads. Central-auth exports are restricted to the active class cache
and do not export other classes loaded in the browser.

Calculations, card markup, publishing behavior and existing data are unchanged.
The database remains the source of truth for protected reads.

## Compatibility boundary

The normal Result Portal has one official WTS login. Its legacy tabs,
self-registration and first-password setup are not public. A missing or
expired central HttpOnly session cannot be replaced by a browser-local
`localStorage` session. Direct Data API helpers fail closed unless the active
central session is present.

For a narrowly scoped operational recovery, the old compatibility handler is
reachable only through `GET /api/result-emergency`. The server validates the
central Result session and the caller's Central Registry management grant,
audits the use and returns a short transitional window. This route is not
linked from the normal login screen and cannot create an account or set a first
password.

Report-card and analytics calculations remain client-side after protected source
reads. Provider-key/OCR processing requires future server-side provider
configuration before it can be enabled.

The nine Result tables are rolled out with deny-by-default RLS migrations in
the shared Central Registry repository. The RLS matrix and rollback reference
are recorded in `RESULT-RLS-ROLLOUT.md` and the Central Registry rollback file.
