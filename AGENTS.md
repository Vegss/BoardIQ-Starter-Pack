# BoardIQ workshop instructions

Help a non-technical board member build a prototype. Be an active, calm implementation partner: inspect files, run commands, edit code and resolve ordinary errors. Use plain language and brief updates. Do not use test-driven development or write tests unless explicitly asked.

## First-time setup

Read `SETUP_FOR_AI.md` before implementation. Participants sign in, approve prompts and enter private values in approved settings; you handle commands, Git, Docker, migrations and troubleshooting. They receive a private configuration from the organiser and do not create Supabase projects.

In GitHub Codespaces (`CODESPACES=true`), Docker runs inside the devcontainer. Do not ask participants to install Docker Desktop. The preview uses forwarded port 3000; use its Codespaces browser URL. Import uploaded participant files from ignored `.boardiq-private/`. The app starts automatically on reopening after its first setup.

## Project map

- `frontend/` is Next.js 15 / React 19. Landing page: `frontend/app/page.tsx`; server routes: `frontend/app/api/`.
- Keep Docker service `my-prototype` and internal port 3000. Codespaces forwards port 3000. Local browser port defaults to 3000; `BOARDIQ_PORT` in `.env` may override it when requested. This workspace uses 3003 to leave existing apps running.
- `.env` contains participant settings. `.env.admin` is team-only. `.boardiq-private/` contains generated participant files. All are ignored by Git.
- `.env.example` lists all participant variables; `.env.admin.example` lists organiser variables.
- `frontend/lib/database/server.ts` provides server-only PostgreSQL queries.
- `frontend/lib/supabase/server.ts` provides server-only access to the assigned Storage bucket.

All browser data/file requests go through same-origin Next.js `/api/...` routes. Never introduce browser-to-Supabase calls or expose database, storage-password or administrator credentials.

## Shared project isolation

Every prototype has its own `prototype_...` schema and matching restricted database login. Never use `public` for product data, provisioning metadata or migration records. Never use an administrator connection for a participant app. `queryDatabase()` verifies the role and selects the assigned schema inside each transaction; schema selection alone is not an access-control boundary.

All product schema changes belong in new timestamped SQL files directly under `supabase/migrations/`. Use unqualified product table names so each prototype receives the same migration in its own schema. Never edit a migration that may have been applied. The runner refuses public/system schemas and administrator logins, and stores the ledger separately in each assigned schema.

`supabase/migrations/provisioning/` contains administrator-only SQL templates. The participant migration runner ignores this subdirectory. Provisioning changes Supabase Storage permissions in the existing `storage` schema; it does not create product tables there. The SQL `PUBLIC` role is not the `public` schema.

Prototype schemas are not exposed through the Supabase Data API and are accessible only to their restricted database role. Do not grant `anon`, `authenticated` or `PUBLIC` access to them. For this fictional workshop setup, tables owned by the prototype role may keep RLS disabled; never carry that assumption into an app for real board or personal data.

Storage uses a separate technical Auth identity and a custom restricted PostgreSQL Storage role per prototype, assigned with the administrator API. It never uses the shared authenticated role. Bucket policies also restrict its access. End-user permissions inside a prototype require their own application authentication. Use the Storage API for bucket/file operations; never manipulate Storage metadata rows directly.

## Environment

Participant settings: `SUPABASE_URL`, `SUPABASE_KEY` (publishable), `SUPABASE_DB_URL` (restricted), `SUPABASE_SCHEMA`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_STORAGE_EMAIL`, `SUPABASE_STORAGE_PASSWORD`. These remain server-only and must be set in Vercel private settings.

Team settings in `.env.admin`: project URL, publishable key, `SUPABASE_SERVICE_ROLE_KEY`, administrator `SUPABASE_DB_URL`. Never load `.env.admin` into a participant service or distribute it. Its DB connection and API key must refer to the same project. `BOARDIQ_PORT` is a local-only browser-port override, not a Vercel setting.

## Commands

- Participant start/import: `bash setup.sh /private/path/prototype.env`; later `bash setup.sh`.
- Organiser provisioning: `bash provision.sh workshop-name`.
- Apply product migrations: `bash migrate.sh`.
- Rebuild after package changes: `docker compose up --build -d my-prototype`.
- Logs: `docker compose logs -f`; stop: `docker compose down`.
- Save: `bash save.sh "Describe the change"`.

Vercel runs `npm run migrate` before building. Missing DB settings cause an explicit migration skip so design-only prototypes can deploy. Live source edits reload through mounts; restarting the service refreshes mounted dependencies.

After meaningful changes, briefly explain the result and give one simple next action. Never commit credentials. Do not request passwords or connection strings in chat.
