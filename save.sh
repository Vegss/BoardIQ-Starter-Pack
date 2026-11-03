#!/usr/bin/env bash

# Save a workshop prototype to its existing GitHub repository.
set -eu

cd "$(dirname "$0")"
message="${1:-Update prototype}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This folder is not connected to Git yet, so there is nowhere to save online."
  exit 1
fi

branch="$(git branch --show-current)"
if [ -z "$branch" ]; then
  echo "Git needs a named branch before it can save this prototype. Ask your AI assistant for help."
  exit 1
fi

git add --all
if git diff --cached --quiet; then
  echo "Everything is already saved—there are no new changes to send to GitHub."
  exit 0
fi

git commit -m "$message"
git push --set-upstream origin "$branch"

echo ""
echo "Your code is safely backed up to GitHub."
echo "If Railway or Vercel is connected to this repository, your live prototype should update in about a minute."
