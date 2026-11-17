#!/usr/bin/env bash

# Run the same Supabase migration runner used during Vercel builds, without
# requiring a database client on the host computer.
set -eu

project_dir="$(cd "$(dirname "$0")" && pwd)"
cd "$project_dir"

if [ "${CODESPACES:-}" = "true" ]; then
  export BOARDIQ_PORT=3000
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  if [ "${CODESPACES:-}" = "true" ]; then
    echo "Docker is not ready in this Codespace. Run Codespaces: Rebuild Container from the Command Palette, then run bash migrate.sh again." >&2
  else
    echo "Docker Desktop is not running. Start it, then run bash migrate.sh again." >&2
  fi
  exit 1
fi

docker compose run --rm --no-deps \
  my-prototype \
  npm run migrate
