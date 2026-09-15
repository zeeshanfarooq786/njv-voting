#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/backend"
if [ ! -f database/database.sqlite ]; then
  touch database/database.sqlite
fi
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link --force >/dev/null 2>&1 || true
php artisan serve --host=127.0.0.1 --port=8000 &
BACKEND_PID=$!

cd "$ROOT/frontend"
npm run dev -- --host 0.0.0.0 --port=5173 &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait
