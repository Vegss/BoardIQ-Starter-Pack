#!/usr/bin/env bash
# Import a participant configuration safely, then start the workshop app.
set -eu
cd "$(dirname "$0")"
umask 077

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Open Docker Desktop, wait until it is running, then continue setup."
  exit 1
fi

participant_config="${1:-}"
if [ -n "$participant_config" ]; then
  if [ ! -f "$participant_config" ]; then
    echo "The supplied private configuration file could not be found."
    exit 1
  fi
  temporary_file="$(mktemp "${TMPDIR:-/tmp}/boardiq-env.XXXXXX")"
  trap 'rm -f "$temporary_file"' EXIT
  # Preserve unrelated application settings. Never execute imported file contents.
  if [ -f .env ]; then
    sed '/^SUPABASE_/d; /^NEXT_PUBLIC_SUPABASE_/d; /^PORT=/d; /^CORS_ORIGINS=/d; /^NEXT_PUBLIC_API_URL=/d; /^BACKEND_URL=/d' .env > "$temporary_file"
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    case "$line" in *=*) ;; *) echo "Invalid private configuration format."; exit 1 ;; esac
    variable_name="${line%%=*}"
    case "$variable_name" in
      SUPABASE_URL|SUPABASE_KEY|SUPABASE_DB_URL|SUPABASE_SCHEMA|SUPABASE_STORAGE_BUCKET|SUPABASE_STORAGE_EMAIL|SUPABASE_STORAGE_PASSWORD|BOARDIQ_PORT)
        printf '%s\n' "$line" >> "$temporary_file" ;;
      *) echo "The configuration contains unsupported settings. Use the file supplied by your organiser."; exit 1 ;;
    esac
  done < "$participant_config"
  for required_name in SUPABASE_URL SUPABASE_KEY SUPABASE_DB_URL SUPABASE_SCHEMA SUPABASE_STORAGE_BUCKET SUPABASE_STORAGE_EMAIL SUPABASE_STORAGE_PASSWORD; do
    if ! awk -F= -v required_name="$required_name" '$1 == required_name && length($0) > length($1) + 1 { found = 1 } END { exit !found }' "$temporary_file"; then
      echo "The private configuration is incomplete. Ask the organiser for a complete file."
      exit 1
    fi
  done
  schema_value="$(sed -n 's/^SUPABASE_SCHEMA=//p' "$temporary_file")"
  if [[ ! "$schema_value" =~ ^prototype_[a-z0-9_]+$ ]] || [ "${#schema_value}" -gt 63 ]; then
    echo "A valid assigned prototype schema is required. Public schemas are not allowed."
    exit 1
  fi
  mv "$temporary_file" .env
  trap - EXIT
  chmod 600 .env
fi

if [ ! -f .env ] || ! awk -F= '$1 == "SUPABASE_SCHEMA" && $2 ~ /^prototype_[a-z0-9_]+$/ { found = 1 } END { exit !found }' .env; then
  echo "Your organiser supplies a private prototype configuration. Ask your AI assistant to import it using bash setup.sh /path/to/prototype.env."
  exit 1
fi
if awk -F= '$1 ~ /^SUPABASE_(SERVICE_ROLE_KEY|SECRET_KEY)$/ && length($2) { found = 1 } END { exit !found }' .env; then
  echo "Move administrator API credentials into .env.admin before starting a participant app."
  exit 1
fi

echo "Starting your BoardIQ workspace. The first start can take a few minutes."
docker compose up --build -d my-prototype
echo "Preparing your prototype database."
bash migrate.sh
browser_port="$(sed -n 's/^BOARDIQ_PORT=//p' .env | head -n 1)"
echo "All set. Open http://localhost:${browser_port:-3000} in your browser."
