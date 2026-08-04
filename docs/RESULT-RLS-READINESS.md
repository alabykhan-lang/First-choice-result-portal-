# Result RLS Readiness

RLS is a table-by-table release gate. It must not be enabled globally while
legacy browser paths still depend on anonymous Data API reads or writes.

| Table | Protected central replacement | Legacy dependency | RLS status |
| --- | --- | --- | --- |
| `students` | `read.students`, `students.upsert`, `students.archive` | Legacy reads and writes remain | Not ready |
| `scores` | `read.scores`, `scores.enter` | Legacy reads and writes remain | Not ready |
| `traits` | `read.traits`, `school_result_traits_update` | Legacy reads and writes remain | Not ready |
| `remarks` | `read.remarks`, `school_result_remarks_update` | Legacy reads and writes remain | Not ready |
| `fees` | `read.fees`, `school_result_fees_update` | Legacy reads and writes remain | Not ready |
| `published_subjects` | `read.published_subjects`, `results.publish` | Legacy reads remain; direct anonymous writes are revoked | Not ready |
| `settings` | `school_result_settings_read`, app-config adapter | Legacy settings path remains | Not ready |
| `user_profiles` | Protected Result administration actions | Legacy login/profile reads remain | Not ready |
| `invite_codes` | Protected Result invite actions | Legacy reads remain; direct anonymous writes are revoked | Not ready |

## Rollout gate

For each table, first compare protected responses with the current operational
workflow using read-only tests. Then migrate the remaining legacy path, add
policies for the central identity/session contract, test denied and allowed
scope cases, and only then enable RLS for that table. Never use a broad policy
as a temporary substitute for a missing assignment.

## Rollback

If a table causes an operational regression, disable the affected UI/API route,
revert the policy change through a reviewed migration, and confirm counts and
report-card output. Do not restore unrestricted writes or drop identity/session
tables. See `RESULT-ROLLBACK-PLAN.md`.
