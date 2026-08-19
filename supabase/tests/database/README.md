# Database tests

These pgTAP tests run inside a transaction and roll back all test users and
records. They exercise real Supabase Auth bootstrap triggers, JWT-based RLS,
private Storage policies, stage-history invariants, and AI-run RPC permissions.

With Docker Desktop or Podman running:

```powershell
npx supabase start
npx supabase db reset
npx supabase test db supabase/tests/database --local
```

The test SQL deliberately inserts temporary `auth.users` rows. Run it against a
local disposable database, not a production project.

