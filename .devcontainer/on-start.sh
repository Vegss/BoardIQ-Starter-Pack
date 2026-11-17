#!/usr/bin/env bash
set -eu
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo 'Open Copilot Chat in Agent mode and say: Please start the BoardIQ setup.'
  exit 0
fi

# Reuse participant validation and apply any pending migrations when reopening.
bash setup.sh
