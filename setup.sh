#!/usr/bin/env bash

# A friendly first-run helper for the BoardIQ prototyping workshop.
set -eu

cd "$(dirname "$0")"

echo ""
echo "Welcome to the BoardIQ prototyping session!"
echo "We'll connect your workspace and start the local prototype."
echo ""

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop is not running yet."
  echo "Please open the Docker Desktop app, wait until it says it is running, then run this script again."
  exit 1
fi

value_from_env() {
  if [ -f .env ]; then
    sed -n "s/^$1=//p" .env | head -n 1
  fi
}

needs_value() {
  case "${1:-}" in
    ""|your_supabase_url|your_supabase_key|paste-your-supabase-url-here|paste-your-anon-key-here) return 0 ;;
    *) return 1 ;;
  esac
}

ask_for_value() {
  variable_name="$1"
  friendly_name="$2"
  current_value="$(value_from_env "$variable_name")"

  if needs_value "$current_value"; then
    while :; do
      printf 'Paste your Supabase %s: ' "$friendly_name" >&2
      IFS= read -r current_value
      if ! needs_value "$current_value"; then
        break
      fi
      echo "That value looks empty. Please paste it and try again." >&2
    done
  fi

  printf '%s' "$current_value"
}

set_env_value() {
  variable_name="$1"
  variable_value="$2"
  temporary_file="$(mktemp "${TMPDIR:-/tmp}/boardiq-env.XXXXXX")"
  umask 077

  if [ -f .env ]; then
    grep -v "^${variable_name}=" .env > "$temporary_file" || true
  fi
  printf '%s=%s\n' "$variable_name" "$variable_value" >> "$temporary_file"
  mv "$temporary_file" .env
}

ensure_env_value() {
  variable_name="$1"
  default_value="$2"
  current_value="$(value_from_env "$variable_name")"
  if [ -z "$current_value" ]; then
    set_env_value "$variable_name" "$default_value"
  fi
}

remove_env_value() {
  variable_name="$1"
  [ -f .env ] || return 0

  temporary_file="$(mktemp "${TMPDIR:-/tmp}/boardiq-env.XXXXXX")"
  umask 077
  grep -v "^${variable_name}=" .env > "$temporary_file" || true
  mv "$temporary_file" .env
}

supabase_url="$(ask_for_value SUPABASE_URL "project URL")"
supabase_key="$(ask_for_value SUPABASE_KEY "anon public key")"
supabase_db_url="$(ask_for_value SUPABASE_DB_URL "private database connection from Supabase Connect")"
set_env_value SUPABASE_URL "$supabase_url"
set_env_value SUPABASE_KEY "$supabase_key"
set_env_value SUPABASE_DB_URL "$supabase_db_url"
# Remove values from the old two-service setup. Keeping PORT=8000 would make
# Next.js listen on the wrong port inside Docker.
remove_env_value CORS_ORIGINS
remove_env_value NEXT_PUBLIC_API_URL
remove_env_value BACKEND_URL
remove_env_value PORT
echo ""
echo "Starting your BoardIQ workspace. The first start can take a few minutes."
docker compose up --build -d my-prototype
echo "Preparing the BoardIQ sample database."
bash migrate.sh
echo ""
echo "All set. Open http://localhost:3000 in your browser."
echo "If you need help, ask your AI assistant to read AGENTS.md."
