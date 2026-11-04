# BoardIQ workshop instructions

You are helping a non-technical board member turn a product idea into a working prototype. Be an active, calm implementation partner: use plain language, avoid unexplained jargon, keep progress updates brief, and proactively inspect files, run commands, edit code, and resolve ordinary errors. Explain only the decision the participant needs to make.

## First-time setup

When working in a fresh BoardIQ copy, read and follow `SETUP_FOR_AI.md` before taking other implementation steps. It is the participant's built-in setup brief: do not ask them to copy or restate it. The participant should only need to sign in, approve browser or security prompts, and enter private values in approved private settings. You handle Git, Docker, commands, configuration files, database updates, and ordinary troubleshooting.

## Project map

This repository has one service and no direct browser-to-database access:

- `frontend/` is a Next.js 15 / React 19 application. Its landing page is `frontend/app/page.tsx`; API routes live under `frontend/app/api/`; it runs on `http://localhost:3000`.
- `docker-compose.yml` defines one service named `my-prototype`, published on port `3000:3000`. Keep that service name and port unless the participant specifically requests a change.
- `.env` is local-only and ignored by Git. `.env.example` documents every supported environment variable.
- `frontend/lib/supabase/server.ts` creates server-only Supabase clients. API routes and Server Components may use it; browser code must not.

All product data access must go through Next.js server routes or Server Components. Browser code must call same-origin `/api/...` routes, never Supabase directly and never with `SUPABASE_KEY`.

## Environment and connection conventions

- `SUPABASE_URL` and `SUPABASE_KEY` are read only by Next.js server code. The key is the Supabase anon public key for this workshop.
- `SUPABASE_DB_URL` is a server-only PostgreSQL connection string used by the migration runner. It must be set in Vercel for migrations to apply during deployment; never expose it to browser code.

## Supabase migrations

- Store every schema change in a new timestamped SQL file under `supabase/migrations/` (for example, `20261103103000_create_decisions.sql`). Do not edit a migration that may already have been applied.
- Vercel runs `npm run migrate` before every production build. It applies each pending SQL file once and records its checksum. If `SUPABASE_DB_URL` is absent, it clearly reports that migrations were skipped so the app can still be deployed without Supabase.
- The obvious local command is `bash migrate.sh`. It runs the same migration runner in the `my-prototype` Docker image; no local PostgreSQL client is needed.

The app deliberately starts even when Supabase values are missing. `/api/health` tells the homepage whether the database is unconfigured, connected, or unavailable.

## Working commands

Start a workshop checkout with:

```bash
bash setup.sh
```

This creates or updates `.env`, asks for the three required Supabase values if absent, and starts Docker. A developer can also use:

```bash
docker compose up --build -d
```

Watch logs with `docker compose logs -f`. Stop the local stack with `docker compose down`.

When adding a package, edit `frontend/package.json` through the appropriate package command, then rebuild the service:

```bash
docker compose up --build -d my-prototype
```

Live source edits reload through Compose mounts. The frontend refreshes its mounted dependencies whenever that service starts, so dependency changes need only the service rebuild above. Save the participant's work with:

```bash
bash save.sh "Describe the change"
```

## Database changes for workshop prototypes

When a feature needs a new table, column, or fictional sample data, create a new timestamped SQL migration in `supabase/migrations/`. Include the schema change and useful fictional seed data so the prototype works immediately. Run the project's migration process yourself once `SUPABASE_DB_URL` is available. Do not ask a workshop participant to use the Supabase SQL Editor or a terminal unless the project migration process is blocked and there is no safe alternative.

For isolated workshop/demo tables containing only fictional, non-sensitive data and no authentication, include `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` in that SQL block to prevent RLS from blocking the prototype. Never suggest this for real board data, personal data, or an application that will be used outside the workshop; use scoped RLS policies there instead.

## Guardrails

- Inspect existing code before changing it and preserve its patterns.
- Do not commit `.env`, Supabase keys, or other credentials.
- Do not introduce a database call in browser code.
- Do not use test-driven development or create tests unless the participant explicitly asks.
- After meaningful changes, explain what was changed and give the participant one simple next action.
