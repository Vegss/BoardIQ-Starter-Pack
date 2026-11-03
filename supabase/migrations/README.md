# Supabase migrations

Create one new timestamped `.sql` file here for every database schema change.
For example: `20261103103000_create_decisions.sql`.

Run `bash migrate.sh` to apply pending files locally. Railway runs the same
migrations automatically before each backend deployment when `SUPABASE_DB_URL`
is configured.
