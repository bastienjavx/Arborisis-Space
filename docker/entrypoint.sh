#!/bin/sh
set -e

# Les migrations et le seed sont exécutés UNE SEULE FOIS par déploiement via la
# release phase Railway (`preDeployCommand` dans railway.toml), pas ici : exécuter
# `prisma migrate deploy` au boot de chaque réplica provoquait une course entre
# instances et ralentissait le démarrage. Cet entrypoint ne fait que démarrer l'API.
#
# En dehors de Railway (ex. docker-compose local), lancer manuellement avant :
#   npx prisma migrate deploy && npx prisma db seed

echo "[startup] NODE_ENV=$NODE_ENV"
echo "[startup] DATABASE_URL is $([ -n "$DATABASE_URL" ] && echo "set (${#DATABASE_URL} chars)" || echo "EMPTY/UNSET")"

if [ -z "$DATABASE_URL" ]; then
  echo "[startup] FATAL: DATABASE_URL is not set."
  exit 1
fi

# Prisma 6.x (validation WASM) lit le .env plutôt que process.env dans certains cas.
printf 'DATABASE_URL=%s\n' "$DATABASE_URL" > /app/.env

echo "[startup] Starting API..."
exec node apps/api/dist/main.js
