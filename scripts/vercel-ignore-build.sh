#!/usr/bin/env bash
set -u

previous="${VERCEL_GIT_PREVIOUS_SHA:-}"
current="${VERCEL_GIT_COMMIT_SHA:-}"

# If Vercel cannot provide a comparison range, build rather than risk
# skipping a product change.
if [ -z "$previous" ] || [ -z "$current" ]; then
  exit 1
fi

# Exit 0 => Vercel skips the build. Exit 1 => Vercel builds.
if git diff --quiet "$previous" "$current" -- \
  src \
  api \
  supabase \
  index.html \
  package.json \
  package-lock.json \
  vercel.json \
  vite.config.ts \
  tsconfig.json \
  .env.example
then
  exit 0
fi

exit 1
