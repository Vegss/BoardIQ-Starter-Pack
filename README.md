# BoardIQ Prototype Sandbox

This is a friendly starting point for board members building a small product prototype with an AI coding assistant. It includes a Next.js frontend, a FastAPI backend, an optional Supabase database connection, and Docker so the setup stays consistent.

## Start with your AI assistant

Before starting, install **Git** and **Docker Desktop**. They are required. Then open Docker Desktop and wait until it is running.

Open this project in your AI coding assistant and say: **“Please start the BoardIQ setup.”** The repository already includes the complete setup brief in `SETUP_FOR_AI.md`; Codex reads it through `AGENTS.md`. The assistant should handle Git, Docker, configuration, database updates, and troubleshooting while you only sign in and enter private values in the correct private screens.

You will need a GitHub account and a Supabase project for the first working version. Create Railway and Vercel accounts later, after the local prototype works. Use GitHub sign-in for those providers where available.

The homepage shows whether the frontend, backend, and Supabase connection are ready. A missing Supabase connection is okay—you can start designing before you add data.

## AI and developer reference

```bash
# Start (or restart) your local workspace
bash setup.sh

# Save your changes to GitHub
bash save.sh "Describe what you changed"

# Apply the Supabase project updates
bash migrate.sh
```

Your frontend is at [http://localhost:3000](http://localhost:3000). The backend health page is at [http://localhost:8000/health](http://localhost:8000/health).

## Deploying later

The backend is prepared for Railway via `railway.json`. On every Railway deployment it applies the SQL files in `supabase/migrations/` before starting the API. Add `SUPABASE_DB_URL` to Railway using the connection string from Supabase **Connect** (the Session pooler is suitable); it is used only by the migration runner and never exposed to the browser. If the variable is not configured yet, deployment continues and prints that migrations were skipped.

To apply the same migrations locally, run `bash migrate.sh`. This uses the backend's Docker image, so you do not need to install Python or database tools on your computer. When you add a new database feature, create one timestamped `.sql` file in `supabase/migrations/` and run this command before deploying.

When you deploy the frontend to Vercel, set `NEXT_PUBLIC_API_URL` to the public URL of the Railway backend and add your Vercel URL to the backend's `CORS_ORIGINS`. If those services are connected to GitHub, `bash save.sh` will trigger their usual automatic deployment.

Keep `.env` private: it contains your local Supabase connection details and is already ignored by Git.
