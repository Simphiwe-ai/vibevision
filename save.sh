#!/usr/bin/env bash
set -euo pipefail

cd ~/Projects/vibevision

message="${1:-Save progress}"

git add -A

# Never publish secrets (.env, .env.local) to the public repo.
if git diff --cached --name-only | grep -Ei '(^|/)\.env(\.|$)' | grep -vi '\.example$'; then
  echo "STOPPED: the .env file(s) listed above are staged. Nothing was saved."
  git reset -q
  exit 1
fi

if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -q -m "$message"
  echo "Committed: $message"
fi

git push origin main
echo "Saved to GitHub."
