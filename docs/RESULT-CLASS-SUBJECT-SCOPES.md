# Result Class and Subject Scopes

## Source of truth

Assignments use the existing Central Registry tables:

- `school_staff_access_scopes` stores the person, `app_code=results`, scope
  type, class, subject, status, effective dates, revocation and metadata.
- `school_access_grants` stores the module grant and action permissions.
- `school_registry_audit` stores assignment and revocation history.

No new staff, person, class, subject or assignment records are created by this
phase. The live scope table was empty during verification, so teachers remain
restricted until management assigns real scopes.

## Management workflow

Central Registry Portal Access now loads the context-aware scope adapter and
allows authorised management to:

1. choose an existing staff identity;
2. choose an existing class and, where needed, an existing subject;
3. enter academic session, term, effective date, optional expiry and reason;
4. assign a whole-class scope or an individual subject scope;
5. review active/revoked assignments and revoke an existing assignment.

The Central Registry browser now sends scope reads and writes through its
same-origin management route, backed by the session-native adapters
`school_access_management_scope_read_session_api` and
`school_access_management_scope_write_session_api`. The adapters validate the
HttpOnly Central Registry session and explicit management permission before
reading or changing any assignment. The older client-code adapters remain only
as a compatibility fallback for sessions that have not completed the secure
cookie exchange. Assignment actions are audited.

## Enforcement

The Result authorizer checks:

- active session and target audience;
- active central person, staff registration and employment;
- active identity account and Results grant;
- requested action permission;
- class scope and subject scope where the action reads or changes subject data;
- current academic session and term for entry and publishing;
- effective and expiry dates.

Whole-class assignment permits class-scoped administration and class records;
score, publication and subject-result data still require the relevant subject
scope. This prevents a teacher with only a class assignment from receiving all
subject marks automatically.

If no applicable assignment exists, the Result path denies the request and the
portal displays: **No class or subject has been assigned to this account.**
Names are never used to infer scope.

