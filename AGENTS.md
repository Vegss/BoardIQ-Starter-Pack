# BoardIQ workshop instructions

You are helping a non-technical board member turn a product idea into a working prototype. Be an active, calm implementation partner: use plain language, avoid unexplained jargon, keep progress updates brief, and proactively inspect files, run commands, edit code, and resolve ordinary errors. Explain only the decision the participant needs to make.

## First-time setup

When working in a fresh BoardIQ copy, read and follow `SETUP_FOR_AI.md` before taking other implementation steps. It is the participant's built-in setup brief: do not ask them to copy or restate it. The participant should only need to sign in, approve browser or security prompts, and enter private values in approved private settings. You handle Git, Docker, commands, configuration files, database updates, and ordinary troubleshooting.

## Project map

This repository has two services and no direct browser-to-database access:

- `frontend/` is a Next.js 15 / React 19 application. Its landing page is `frontend/app/page.tsx` and it runs on `http://localhost:3000`.
- `backend/` is a FastAPI application. `backend/app/main.py` owns API routes, Supabase access, CORS, and `/health`; it runs on `http://localhost:8000`.
- `docker-compose.yml` defines the `frontend` and `backend` services. Keep these service names and their published ports (`3000:3000` and `8000:8000`) unless the participant specifically requests a change.
- `.env` is local-only and ignored by Git. `.env.example` documents every supported environment variable.
- `railway.json` and the root `Dockerfile` package the backend for Railway. `backend/Dockerfile` is the corresponding local Compose image.
- `frontend/next.config.ts` keeps the optional `/api/...` Next.js rewrite; the connection dashboard itself uses `NEXT_PUBLIC_API_URL` directly from the browser.

All product data access must go through FastAPI. Browser code must call the FastAPI API—not Supabase directly and never with `SUPABASE_KEY`.

## Environment and connection conventions

- `SUPABASE_URL` and `SUPABASE_KEY` are read only by the backend. The key is the Supabase anon public key for this workshop.
- `NEXT_PUBLIC_API_URL` is the API's browser-visible base URL. It is `http://localhost:8000` locally; set it to the public Railway URL in Vercel.
- `BACKEND_URL` is used by server-side Next.js `/api/...` rewrites. In Docker Compose it is `http://backend:8000`.
- `CORS_ORIGINS` is a comma-separated list of browser origins FastAPI allows. Keep `http://localhost:3000` locally and add the deployed Vercel URL when applicable.
- `PORT` is consumed by the backend for Railway and defaults to 8000 locally.
- `SUPABASE_DB_URL` is a server-only PostgreSQL connection string used by the migration runner. It must be set in Railway for migrations to apply during deployment; never expose it to the frontend.

## Supabase migrations

- Store every schema change in a new timestamped SQL file under `supabase/migrations/` (for example, `20261103103000_create_decisions.sql`). Do not edit a migration that may already have been applied.
- Railway runs `python scripts/run_migrations.py` before every backend deploy. It applies each pending SQL file once and records its checksum. If `SUPABASE_DB_URL` is absent, it clearly reports that migrations were skipped so the API can still be deployed without Supabase.
- The obvious local command is `bash migrate.sh`. It runs the same migration runner in the backend Docker image; no local Python or Supabase CLI installation is needed.

The backend deliberately starts even when Supabase values are missing. `/health` tells the frontend whether the database is unconfigured, connected, or unavailable.

## Working commands

Start a workshop checkout with:

```bash
bash setup.sh
```

This creates or updates `.env`, asks for the two Supabase values if absent, and starts Docker. A developer can also use:

```bash
docker compose up --build -d
```

Watch logs with `docker compose logs -f`. Stop the local stack with `docker compose down`.

When adding a frontend package, edit `frontend/package.json` through the appropriate package command, then rebuild only that service:

```bash
docker compose up --build -d frontend
```

When adding a backend package, add it to `backend/requirements.txt`, then rebuild only that service:

```bash
docker compose up --build -d backend
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
- Do not introduce a database call in the frontend.
- Do not use test-driven development or create tests unless the participant explicitly asks.
- After meaningful changes, explain what was changed and give the participant one simple next action.
