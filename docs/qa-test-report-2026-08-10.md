# First Choice Result Portal — QA readiness report

Run date: 10 August 2026  
Portal: https://first-choice-result-portal.vercel.app  
Supabase project: `gnixdjglpsaarlrzqgdg`  
Run type: read-only preflight and parallel persona audit

## Executive result

The deployment is reachable and the protected data boundary is responding correctly to anonymous and invalid-origin requests. The portal is **not yet ready for a destructive, authenticated term-transition run**.

Three independent QA personas reviewed the repository and live endpoints in parallel:

- Management persona: staff management, invite control, settings authorization, demo-data safety, and term activation.
- Teacher persona: classes, SS department selection, students, OCR, score entry, publishing, traits, remarks, broadsheet, progress, and refresh behavior.
- Report-card persona: settings propagation, assessment columns, fees, attendance, traits, remarks, and the three templates.

No cloud records were created, deleted, or changed during this run.

## Verified gates

| Gate | Result |
|---|---|
| Portal deployment responds | Pass — HTTP 200 |
| Auth status endpoint responds | Pass — HTTP 200 in the current local-auth design |
| Anonymous result-data request rejected | Pass — HTTP 401 |
| Invalid-origin result-data request rejected | Pass — HTTP 403/401 boundary response |
| Protected-access contract | Pass |
| Three report-card templates present | Pass — Modern, Creative, Premium |
| Assessment settings feed score entry/broadsheet/report-card columns | Pass by source audit |
| Positive signed-in management workflow | Not run — no authorized test session available |
| Positive signed-in teacher workflow | Not run — no authorized test session available |

## Release blockers found

1. Positive cloud testing cannot be completed safely without signed-in management and teacher personas. The controlled test browser has no authenticated portal session.
2. Next-term activation updates local/app configuration separately from the official academic context. It does not create a durable snapshot or provide an undo path, so it must not be activated in the live project during this QA run.
3. `history.*` API actions currently return empty data, so archived-history verification is not meaningful yet.
4. `results.unpublish` is listed by the client but is not explicitly implemented by the data API; unknown actions currently fall through as successful responses.
5. The staff-profile insert policy permits an authenticated user to insert their own profile with an elevated role unless the bootstrap SQL is tightened.
6. Settings persistence is optimistic: local storage is updated before the cloud write completes, and cloud errors are swallowed in some paths. This can make one device appear correct while another device remains stale.
7. OCR uses a browser-held Gemini key and camera capture is disabled by the current Permissions-Policy. OCR must not be treated as production-ready until that boundary is corrected.
8. The assessment UI is dynamic, but the source audit found no validation that CA marks plus exam marks total 100. This can produce inconsistent totals and grades.

## Confirmed source-level behavior

- The three selected report-card layouts use the same live content builder.
- CA count and per-CA marks are consumed by score entry, broadsheet, and report-card column generation.
- School identity, attendance, traits, remarks, fees schedule, signature, and selected template are wired into report-card rendering.
- The current portal has a labelled demo-data loader, but it was not run because no authenticated management test session was available.

## Required next test pass

The next pass should use a clearly labelled QA run, for example `QA-2026-08-10`, with:

- one school-management test account;
- at least two teacher test accounts assigned to different classes;
- 20–30 labelled mock pupils per selected class;
- score, trait, remark, attendance, publication, and report-card checks from separate sessions;
- verification from a second browser/device before any term change;
- three report-card exports, one for each available template;
- only after all checks pass, a management-confirmed term transition with a captured before/after configuration snapshot.

The QA records should remain labelled and visible for the owner’s cross-checking. They should be removed only after the owner confirms that review is complete.
