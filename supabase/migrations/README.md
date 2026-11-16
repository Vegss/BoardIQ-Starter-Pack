# Supabase migrations

Create a new timestamped SQL file directly here for each product schema change. Never edit one that may already have been applied. Use unqualified product table names: the runner selects the assigned private `prototype_...` schema and stores its checksum ledger there. Never use `public`.

Run `bash migrate.sh` locally. Vercel runs the same runner before production builds using the participant's restricted `SUPABASE_DB_URL` and required `SUPABASE_SCHEMA`. It refuses administrator connections.

The `provisioning/` subdirectory contains administrator-only templates used by `bash provision.sh`; these never run during participant migrations or deployment builds.
