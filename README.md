# BoardIQ Prototype Sandbox

Build a workshop prototype with one Next.js application named `my-prototype`. BoardIQ provides an assigned private database schema and a private file bucket in its shared Supabase project. Participants do not create Supabase projects.

## Start with your AI assistant

### GitHub Codespaces (workshop default)

1. Open your own GitHub copy of this template, then choose **Code → Codespaces → Create codespace on main** (or your working branch). Wait for the environment and initial Docker build to finish; the first start can take a few minutes.
2. Open **Copilot Chat**, select **Agent** mode and say **“Please start the BoardIQ setup.”**
3. When the assistant asks, drag the organiser-supplied participant `.env` file into `.boardiq-private/` in the Explorer. Never paste its contents into chat. The assistant imports it and prepares your database.
4. Open **Prototype** on port **3000** in the **Ports** tab. Keep its visibility **Private**. The assistant can also give you the forwarded HTTPS link.

Git and Docker are included in the Codespace; no local installation is needed. Your GitHub account needs Codespaces quota or billing and Copilot access. The devcontainer requests at least 2 CPUs and 8 GB of memory.

The app starts again automatically when you reopen the Codespace after setup. Stop the Codespace when you finish working to avoid using more compute time. Save code to GitHub before deleting a Codespace; a replacement will need the participant configuration uploaded again. Existing template copies need these repository changes before they can use this configuration.

### Local setup

Install Git and Docker Desktop, then open Docker Desktop. Open this project in your assistant and say **“Please start the BoardIQ setup.”** Give the assistant the location of the private configuration file supplied by the workshop organiser; never paste its contents into chat.

The assistant imports the configuration, starts the app and applies migrations. You only sign in to GitHub/Vercel, approve prompts and enter private values in approved private settings.

```bash
bash setup.sh /private/path/my-prototype.env
bash save.sh "Describe your change"
bash migrate.sh
```

The application remains usable for design without database settings. Default local app: [http://localhost:3000](http://localhost:3000). Health check: `/api/health`. If another app uses port 3000, choose a free port with `BOARDIQ_PORT` in the local `.env`. This workspace uses `BOARDIQ_PORT=3003` and opens at [http://localhost:3003](http://localhost:3003). Codespaces always uses forwarded port 3000. This local port setting does not go into Vercel.

## Organiser setup

Keep administrator credentials in `.env.admin`, using `.env.admin.example` as the template. This file is ignored by Git and is not loaded into the participant app. Use the same Supabase project for the URL, publishable key, administrator API key and administrator PostgreSQL connection. The Session pooler connection works on IPv4 workshop networks.

```bash
bash provision.sh workshop-name
```

This creates a random `prototype_...` schema and matching restricted PostgreSQL login, a technical Supabase Auth account with its own restricted Storage role and a private file bucket. The credentials are written to `.boardiq-private/workshop-name.env`, which is also ignored by Git. Give only that participant file to its intended recipient through a private channel; never distribute `.env.admin`.

Provisioning is a team command, never a Vercel build step. It checks inherited privileges for both the database and Storage roles and refuses to issue credentials if those could expose unrelated application data. It does not revoke existing project privileges automatically. The technical account receives its custom role directly through the administrator API, so it does not inherit the shared authenticated role. Storage policies restrict both the assigned bucket and the technical account, including when other permissive policies exist. Bucket files are limited to 10 MB and common image, PDF and text formats. Storage capacity and bandwidth remain shared.

No product tables, provisioning metadata or migration records are created in `public`. Supabase continues using its own `auth` and `storage` schemas. The `PUBLIC` role in SQL grants/policies means all roles; it is unrelated to the `public` schema.

## Building features

Browser code calls same-origin `/api/...` routes. Server routes and Server Components query the database through `frontend/lib/database/server.ts`, which verifies the restricted role and uses the assigned schema. Product SQL belongs in new timestamped files in `supabase/migrations/`. Use unqualified product table names; the runner selects the assigned schema and stores its migration ledger there. Never switch to another schema or use an administrator connection.

For files, server routes call `await getPrototypeStorage()` from `frontend/lib/supabase/server.ts`. It signs in using the prototype's technical storage account and returns its assigned bucket client. Add app-level authentication if prototype end users need different access; the technical account separates prototypes, not users within one prototype. Workshop data must remain fictional.

## Deploying to Vercel

Import the participant repository with Root Directory `frontend`. Put the seven variables from its participant configuration into Vercel's private environment settings: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_SCHEMA`, `SUPABASE_STORAGE_BUCKET`, `SUPABASE_STORAGE_EMAIL`, and `SUPABASE_STORAGE_PASSWORD`. Do not add administrator API keys or the administrator database connection.

Vercel runs migrations before the production build. Each prototype has separate migration history in its assigned schema. The database login is also used at runtime. Local and deployed versions initially share that prototype's data; provision another workspace if separate development data is needed.

## Removing a workshop prototype

Keep the participant configuration privately so the organiser can identify its schema and bucket. Remove files and the bucket through the Storage API, revoke the technical Auth account, drop only that prototype's schema, database role and Storage role, and remove its seven named Storage policies. Database role/password changes require existing sessions to be disconnected when immediate revocation is needed. Never drop shared `auth`, `storage` or `public` schemas.
