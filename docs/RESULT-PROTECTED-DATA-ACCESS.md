# Result Protected Data Access

**Status:** Phase 2 central-auth migration, no PKCE SSO

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

The legacy Result mode remains temporarily for existing production users. Its
direct Data API reads and legacy writes are intentionally not treated as a
secure path and remain listed in the migration plan. Central-auth requests do
not use those direct operations for the protected Result data listed above.
RLS is therefore not enabled globally yet.
