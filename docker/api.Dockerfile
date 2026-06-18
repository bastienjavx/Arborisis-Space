# Dockerfile multi-stage de l'API Arborisis (NestJS + Prisma).
# Construit depuis la RACINE du monorepo :  docker build -f docker/api.Dockerfile .

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV CI=true
# Prisma détecte OpenSSL lors de la génération et à l'exécution.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ── Dépendances + build ──
FROM base AS builder
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY prisma prisma
RUN npm ci
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npx prisma generate \
  && npm run build -w @arborisis/shared \
  && npm run build -w @arborisis/api

# ── Image d'exécution ──
FROM base AS runner
ENV NODE_ENV=production
# node_modules complet (inclut prisma CLI pour `migrate deploy`) + artefacts compilés.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/package.json packages/shared/package.json
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/prisma prisma

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000
CMD ["/entrypoint.sh"]
