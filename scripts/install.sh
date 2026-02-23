#!/usr/bin/env sh
# Install all dependencies (api + app). Run from repo root.
# Requires Node.js: https://nodejs.org/

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Installing dependencies from: $ROOT"

if [ -f api/package.json ]; then
  echo "\n--- api ---"
  (cd api && npm install)
fi

if [ -f app/package.json ]; then
  echo "\n--- app ---"
  (cd app && npm install)
fi

echo "\nDone. You can run: cd api && npm start"
