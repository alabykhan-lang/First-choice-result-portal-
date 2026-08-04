# Result Legacy Migration Status

## Completed

- Result login no longer accepts legacy browser passwords or first-password
  setup.
- Result sessions are accepted only through the server-managed HttpOnly cookie.
- The browser no longer sends Result table requests to the Supabase Data API.
- Legacy database helper names fail closed when called without the central
  session boundary.
- Result reads, writes, publishing, report-card authorization and exports use
  protected server actions.
- The nine high-risk Result tables have individual RLS migrations and reviewed
  rollback SQL in the Central Registry repository.

## Remaining compatibility

- The old Result database functions remain in the database for controlled
  rollback and server adapters; their inputs still require a validated session
  where exposed.
- Report-card markup, calculations and PDF rendering remain in the browser after
  protected data retrieval.
- Central Registry student/staff/guardian records still use its transitional
  client session until equivalent session-native record adapters are complete.
- Provider-key/OCR processing requires a server-side provider configuration and
  is not enabled from browser storage.

No identity, student, class, score, permission grant or academic record was
created by this migration.
