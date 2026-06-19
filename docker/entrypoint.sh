#!/bin/sh
set -e

echo "[startup] DATABASE_URL is $([ -n "$DATABASE_URL" ] && echo "set (${#DATABASE_URL} chars)" || echo "EMPTY/UNSET")"
echo "[startup] NODE_ENV=$NODE_ENV"

if [ -z "$DATABASE_URL" ]; then
  echo "[startup] FATAL: DATABASE_URL is not set. Cannot run migrations."
  exit 1
fi

# Prisma 6.x WASM validation ne lit pas les variables process.
# On écrit le .env ET on passe --url en argument pour double sécurité.
printf 'DATABASE_URL=%s\n' "$DATABASE_URL" > /app/.env
echo "[startup] Written .env ($(wc -c < /app/.env) bytes)"

echo "[startup] Running: npx prisma migrate deploy"
npx prisma migrate deploy

echo "[startup] Running: npx prisma db seed"
npx prisma db seed

echo "[startup] Seed done. Starting API..."
exec node apps/api/dist/main.js
