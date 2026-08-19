# Casefile — Job Search CRM

Casefile is a private, multi-user job application tracker built as a lightweight CRM and personal ATS. It preserves the exact job description and submitted resume for each application, separates discovery source from application channel, records immutable stage history, tracks contacts/interviews/notes, and calculates a historical funnel without using AI for deterministic work.

AI is optional. When configured, it runs only after an explicit click and only receives text the user chose to analyze. The app never fetches a saved job URL.

## What is included

- Supabase email/password authentication with SSR cookie refresh
- Tenant-safe PostgreSQL schema, composite ownership foreign keys, RLS, and private Storage
- Fast Saved/Applied creation flow, duplicate warning, edit, archive, restore, and confirmed deletion
- Search, filtering, sorting, pagination, application case files, and exact JD archive
- Atomic status changes, complete stage history, unified activity timeline, and a Kanban-style pipeline
- Immutable PDF/DOCX/TXT resume versions, automatic text extraction with a manual fallback, private downloads, and one submitted resume per application
- Contacts, timestamped notes, interviews/events, and an internal upcoming-interview calendar
- Optional AI job extraction, resume comparison, and two interview-prep modes
- History-based dashboard, conversions, source/channel effectiveness, time series, and Sankey flow
- Opt-in demo seed, Vitest suites, and pgTAP RLS/invariant tests

## Stack

- Next.js 16 App Router, React 19, strict TypeScript
- Tailwind CSS 4, shadcn-style primitives, Radix UI, Lucide
- Supabase Auth, PostgreSQL, Row Level Security, and private Storage
- Vercel AI SDK with a centralized OpenAI provider
- Zod, React Hook Form, Recharts, date-fns, PDF.js, Mammoth, Vitest

## Prerequisites

- Node.js 22.13 or newer
- npm
- A [Supabase](https://supabase.com/dashboard) project
- Optional: an [OpenAI API](https://platform.openai.com/api-keys) key
- Optional for local database tests: Docker Desktop and the Supabase CLI

## 1. Install

```bash
npm install
```

Copy the environment template without editing the committed example:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

## 2. Create the Supabase project and get its values

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and select **New project**.
2. Choose an organization, project name, region, and a strong database password. Save the database password in a password manager; it is not an application environment variable.
3. Wait for provisioning, then open the project and choose **Connect**.
4. Copy the **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`.
5. Copy the **Publishable key** into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
6. If an older project shows only a legacy **anon** key, put it in `NEXT_PUBLIC_SUPABASE_ANON_KEY` and leave the publishable-key value blank. Do not add a `service_role` or secret key—the application does not need one.
7. The short project reference appears in the dashboard URL (`/project/<project-ref>`) and in Connect. Put it in `SUPABASE_PROJECT_REF` only if you want the linked CLI convenience scripts; it is not secret.

The URL and publishable/anon key are intentionally browser-visible. Security comes from authentication and RLS. Never expose the database password, a secret key, or a service-role key.

Your `.env.local` should now begin like this:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF
```

## 3. Apply the database migration

The preferred workflow keeps the schema reproducible:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
npm run db:types:linked
```

The link command may ask for the database password created with the project. The migration creates tables, indexes, triggers, RPCs, RLS policies, and the private `resumes` Storage bucket.

The repository includes generated-compatible types at `types/database.ts`. Regenerate them after every schema change and review the resulting diff.

### Local Supabase alternative

With Docker Desktop running:

```bash
npm run db:start
npm run db:reset
npm run db:types
npm run db:lint
npm run db:test
```

Stop the local stack with `npm run db:stop`.

## 4. Configure Supabase Auth URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

1. Set **Site URL** to `http://localhost:3000` for local-only work, or to the production value of `NEXT_PUBLIC_SITE_URL` when deploying.
2. Add `http://localhost:3000/auth/callback` to **Redirect URLs**.
3. Add `https://YOUR_PRODUCTION_DOMAIN/auth/callback` before deploying.

In **Authentication → Email Templates → Confirm signup**, use this confirmation link so SSR can verify the token hash:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

Email/password signup, login, logout, PKCE callback, and token-hash confirmation are implemented. For a personal deployment, create the owner account first, then turn off **Allow new users to sign up** in the Email provider settings before sharing the URL. Leave public registration enabled only after adding CAPTCHA and reviewing the project Auth rate limits.

## 5. Optional OpenAI setup

The tracker, pipeline, documents, calendar, dashboard, and analytics work without an AI key.

1. Sign in to the [OpenAI API platform](https://platform.openai.com/).
2. Open [API keys](https://platform.openai.com/api-keys) and choose **Create new secret key**.
3. Copy the secret when it is shown and store it in a password manager. Do not paste it into chat, commit it, or prefix it with `NEXT_PUBLIC_`.
4. Generate a separate 32-byte capability for trusted Next.js-to-database AI writes:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

5. Add both secrets only to `.env.local`:

```dotenv
AI_PROVIDER=openai
AI_MODEL=gpt-5.6-luna
OPENAI_API_KEY=sk-...
AI_RPC_SECRET=PASTE_THE_GENERATED_CAPABILITY
```

6. In the Supabase SQL Editor, register a hash of that same capability once:

```sql
select private.configure_ai_rpc_secret('PASTE_THE_GENERATED_CAPABILITY');
```

The database stores only its SHA-256 hash. Re-run the function and update `AI_RPC_SECRET` together whenever you rotate it. Without both matching values, AI fails closed while the rest of the CRM keeps working.

7. In the OpenAI project **Limits** page, restrict the project to the intended model and configure conservative model rate limits and budget alerts.

`AI_MODEL` is centralized and can be changed without modifying application services. Only `openai` is enabled in this MVP; the provider boundary is ready for future adapters.

AI requests are explicit, input-hashed, prompt-versioned, schema-validated, cached when appropriate, admitted through atomic rate/concurrency/daily ceilings, and recorded through tenant-bound capability-protected database RPCs. Saved job URLs are never fetched or sent to the model.

## 6. Run locally

Restart Next.js after creating or changing `.env.local`:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, confirm its email if confirmation is enabled, and sign in. The database trigger creates the profile, default sources/channels, and default pipeline stages automatically.

## Demo data (opt-in)

Demo data never runs automatically. First create a real Auth user, then copy its UUID from **Authentication → Users**. Run both commands in the same PostgreSQL session:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -c "set job_crm.demo_user_id = 'YOUR_AUTH_USER_UUID'" -f supabase/seed.sql
```

The seed is idempotent and creates realistic histories for Acme, Globex, Umbrella, Initech, and Stark Industries. Running it without `job_crm.demo_user_id` is a safe no-op.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Or run the complete sequence:

```bash
npm run check
```

Database security/invariant tests live in `supabase/tests/database`. They cover two-user isolation, composite tenant foreign keys, stage/date consistency, private resume ownership, protected submitted resumes, stage-category stability, and AI-run permissions.

## Deployment

Vercel plus hosted Supabase is the reference target:

1. Push the repository to a private or controlled Git host.
2. Import it into Vercel.
3. Add all required Supabase variables and `NEXT_PUBLIC_SITE_URL` in Vercel project settings.
4. Add the four optional AI variables only if AI should be enabled.
5. Apply migrations to the production Supabase project before sending users to the deployment.
6. Update Supabase Site URL and Redirect URLs to the deployed HTTPS domain.
7. Redeploy after changing environment variables.

Do not add a service-role key to Vercel for this application. Normal authenticated Supabase access plus RLS is the intended security model.

## Important behavior

- A job URL is reference-only. There is no scraping, crawling, web search, or automatic AI analysis.
- `raw_job_description` remains the exact text the user pasted. AI output is stored separately.
- Discovery source (“Found via”) and application channel (“Applied through”) are distinct dimensions.
- Stage changes go through a locked database path; current stage and immutable history update together.
- “No response yet” is calculated from history and the profile threshold. It never auto-mutates a case to Ghosted.
- Resume files use immutable, user-prefixed private paths and short-lived signed downloads.
- Resume uploads are limited to 5 MB each, 50 files, and 250 MB per user. PDF/DOCX/TXT text is extracted on the server; manually pasted text takes precedence.
- A failed upload loses authorization immediately. Its allocation stays charged through a conservative 24-hour in-flight grace and is released by a later cleanup check only when the object is still absent.
- AI admission defaults to 6 starts per 10 minutes, 30 per user per UTC day, 2 concurrent runs per user, and 300 starts globally per UTC day. Failed starts still count because provider work may already have occurred.
- Backward/reopened transitions remain in history but are excluded and reported separately from the acyclic Sankey.

## Current verification boundary

Static SQL review, TypeScript, ESLint, unit tests, and production builds can run without credentials. A real end-to-end Auth/RLS/Storage/AI exercise requires your own Supabase project and, for AI, your own OpenAI key. Local pgTAP execution requires Docker/PostgreSQL.

For this personal-MVP scale, analytics aggregates selected rows on the server at request time (up to 100,000 applications/events; lookup tables assume fewer than 1,000 rows). Date-only analytics filters use UTC boundaries, while weekly/monthly labels use the profile timezone.
