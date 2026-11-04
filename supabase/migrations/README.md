# Supabase migrations

Create one new timestamped `.sql` file here for every database schema change.
For example: `20261103103000_create_decisions.sql`.

Run `bash migrate.sh` to apply pending files locally. Vercel runs the same
migrations before each production build when `SUPABASE_DB_URL` is configured.
