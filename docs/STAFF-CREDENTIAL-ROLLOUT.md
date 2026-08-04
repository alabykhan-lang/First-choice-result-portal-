# Staff Credential Rollout

## Existing identity model

Credential activation operates on the existing `school_people`,
`school_identity_accounts`, `school_identity_credentials` and
`staff_attendance_profiles` records. It never creates a replacement staff
identity. Results grants and Result profile mappings are preserved.

The inspection baseline found 24 credential rows for 25 Result identities,
with one active credential and most existing credentials requiring password
setup. These are real production states, not test records.

## Protected management action

The Central Registry access screen and School Platform System Administration
call the existing audited temporary-credential routine through protected server
adapters. Management must provide a reason. The routine:

- generates a one-time temporary password in server/database memory;
- stores only the bcrypt hash;
- sets compulsory password change;
- clears failed attempts and lock state;
- revokes existing identity sessions through the session-state triggers;
- records actor, reason, request and time in the identity audit history;
- returns the temporary value only for one-time private delivery.

The Registry browser keeps the one-time display in memory only. Passwords,
hashes and credentials are not written to logs, source, URLs or localStorage.

## Recovery rules

Expired locks are cleared by credential issuance. Account suspension, inactive
employment, inactive identity accounts, revoked grants and revoked sessions
continue to deny login. Password change remains compulsory until the real staff
member completes it.

Positive activation was not performed against a real account during this
non-destructive release verification because it would change a production
credential. The endpoint contract, negative authorization behavior, migration
privileges and no-data-change checks were verified.
