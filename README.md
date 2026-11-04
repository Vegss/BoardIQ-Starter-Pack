# BoardIQ Prototype Sandbox

This is a friendly starting point for board members building a small product prototype with an AI coding assistant. It uses one Next.js application called `my-prototype` for both the website and server-side API routes, with an optional Supabase database connection.

## Start with your AI assistant

Before starting, install **Git** and **Docker Desktop**. They are required. Then open Docker Desktop and wait until it is running.

Open this project in your AI coding assistant and say: **“Please start the BoardIQ setup.”** The repository already includes the complete setup brief in `SETUP_FOR_AI.md`; Codex reads it through `AGENTS.md`. The assistant should handle Git, Docker, configuration, database updates, and troubleshooting while you only sign in and enter private values in the correct private screens.

You will need a GitHub account, a Supabase project, and a Vercel account for the first deployed version. Use GitHub sign-in when the provider offers it.

The homepage shows whether `my-prototype` and its Supabase connection are ready. A missing Supabase connection is okay—you can start designing before you add data.

## AI and developer reference

```bash
# Start (or restart) your local workspace
bash setup.sh

# Save your changes to GitHub
bash save.sh "Describe what you changed"

# Apply the Supabase project updates
bash migrate.sh
```

Your local prototype is at [http://localhost:3000](http://localhost:3000). Its built-in health check is at [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Deploying to Vercel

Import this repository into Vercel and set its **Root Directory** to `frontend`. In Vercel's private Environment Variables page, add `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_DB_URL`. The app reads the first two values only in server-side Next.js routes. The database URL is used only while Vercel applies pending migrations before a production build. None of these values belong in browser code or GitHub.

To apply the same migrations locally, run `bash migrate.sh`. This uses the `my-prototype` Docker image, so you do not need to install database tools on your computer. When you add a database feature, create one timestamped `.sql` file in `supabase/migrations/` and run this command before deploying.

When Vercel is connected to GitHub, `bash save.sh` triggers the normal Vercel deployment.

Keep `.env` private: it contains your local Supabase connection details and is already ignored by Git.
