# Result RLS Readiness

RLS is a table-by-table release gate. The Result client boundary is now
fail-closed for all legacy browser table operations. Each live RLS migration
must still be applied and verified independently; this document does not
authorize a global toggle.

| Table | Protected central replacement | Legacy dependency | RLS status |
| --- | --- | --- | --- |
| `students` | `read.students`, `students.upsert`, `students.archive` | No active browser Data API path | Ready for table migration |
| `scores` | `read.scores`, `scores.enter` | No active browser Data API path | Ready for table migration |
| `traits` | `read.traits`, `school_result_traits_update` | No active browser Data API path | Ready for table migration |
| `remarks` | `read.remarks`, `school_result_remarks_update` | No active browser Data API path | Ready for table migration |
| `fees` | `read.fees`, `school_result_fees_update` | No active browser Data API path | Ready for table migration |
| `published_subjects` | `read.published_subjects`, `results.publish` | No active browser Data API path | Ready for table migration |
| `settings` | `school_result_settings_read`, app-config adapter | No active browser Data API path | Ready for table migration |
| `user_profiles` | Protected Result administration actions | No active browser Data API path | Ready for table migration |
| `invite_codes` | Protected Result invite actions | No active browser Data API path | Ready for table migration |

## Rollout gate

For each table, confirm the matching protected replacement, deploy the client
boundary, apply the named migration, test denied direct REST access and the
protected unauthenticated contract, then compare production counts. Never use
a broad policy as a temporary substitute for a missing assignment.

## Rollback

If a table causes an operational regression, disable the affected UI/API route,
revert the policy change through a reviewed migration, and confirm counts and
report-card output. Do not restore unrestricted writes or drop identity/session
tables. See `RESULT-ROLLBACK-PLAN.md`.
