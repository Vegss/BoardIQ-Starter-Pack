"""Apply the project's ordered Supabase SQL migrations exactly once."""

from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path

import psycopg


MIGRATIONS_DIR = Path(
    os.environ.get("MIGRATIONS_DIR", Path(__file__).parents[1] / "supabase" / "migrations")
)
MIGRATION_LOCK_ID = 7_381_945_203


def migration_files() -> list[Path]:
    if not MIGRATIONS_DIR.is_dir():
        raise RuntimeError(f"Migration directory does not exist: {MIGRATIONS_DIR}")
    return sorted(path for path in MIGRATIONS_DIR.glob("*.sql") if path.is_file())


def main() -> int:
    database_url = os.environ.get("SUPABASE_DB_URL")
    if not database_url:
        print("SUPABASE_DB_URL is not configured; Supabase migrations were skipped.")
        return 0

    files = migration_files()
    print(f"Checking {len(files)} Supabase migration(s) in {MIGRATIONS_DIR}.")

    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            # Prevent two deployments from applying the same migration at once.
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", (MIGRATION_LOCK_ID,))
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS boardiq_schema_migrations (
                    filename TEXT PRIMARY KEY,
                    checksum TEXT NOT NULL,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cursor.execute("SELECT filename, checksum FROM boardiq_schema_migrations")
            applied = dict(cursor.fetchall())

            for path in files:
                sql = path.read_text(encoding="utf-8")
                checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()
                previous_checksum = applied.get(path.name)

                if previous_checksum:
                    if previous_checksum != checksum:
                        raise RuntimeError(
                            f"Applied migration was changed: {path.name}. "
                            "Create a new migration instead of editing it."
                        )
                    print(f"Already applied: {path.name}")
                    continue

                if sql.strip():
                    cursor.execute(sql)
                cursor.execute(
                    "INSERT INTO boardiq_schema_migrations (filename, checksum) VALUES (%s, %s)",
                    (path.name, checksum),
                )
                print(f"Applied: {path.name}")

    print("Supabase migrations are up to date.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Supabase migration failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
