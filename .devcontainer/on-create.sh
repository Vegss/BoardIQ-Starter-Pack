#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")/.."
umask 077

mkdir -p .boardiq-private
chmod 700 .boardiq-private
docker compose build my-prototype

echo 'BoardIQ is ready for setup. Open Copilot Chat in Agent mode and say: Please start the BoardIQ setup.'
