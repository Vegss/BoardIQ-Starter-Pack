#!/usr/bin/env bash
# Team-only: provision one participant without hosting a central service.
set -eu
cd "$(dirname "$0")"
prototype_name="${1:-}"
if [[ ! "$prototype_name" =~ ^[a-z][a-z0-9-]{0,47}$ ]]; then
  echo "Use: bash provision.sh workshop-name"
  exit 1
fi
if [ ! -f .env.admin ]; then
  echo "Create the private .env.admin file using .env.admin.example. Keep it on the organiser's computer."
  exit 1
fi
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "Open Docker Desktop, wait until it is running, then try again."
  exit 1
fi
umask 077
mkdir -p .boardiq-private
chmod 700 .boardiq-private
chmod 600 .env.admin
if [ -e ".boardiq-private/${prototype_name}.env" ]; then
  echo "A private configuration already exists for that name. Choose a different name."
  exit 1
fi
docker compose run --rm --build --no-deps \
  --user "$(id -u):$(id -g)" \
  --volume "$(pwd)/.env.admin:/run/boardiq-admin.env:ro" \
  --volume "$(pwd)/.boardiq-private:/run/boardiq-output" \
  my-prototype node scripts/provision-prototype.mjs --admin-file /run/boardiq-admin.env \
  --name "$prototype_name" --output "/run/boardiq-output/${prototype_name}.env"
echo "Privately give .boardiq-private/${prototype_name}.env to that participant. Never give them .env.admin."
