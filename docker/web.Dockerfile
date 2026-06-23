# Dockerfile multi-stage du front Arborisis (Next.js standalone).
# Construit depuis la RACINE du monorepo :  docker build -f docker/web.Dockerfile .

FROM node:26-bookworm-slim AS base
WORKDIR /app
ENV CI=true

# ── Dépendances + build ──
FROM base AS builder
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @arborisis/shared && npm run build -w @arborisis/web

# ── Image d'exécution (sortie standalone) ──
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_INTERNAL_URL=http://api:4000
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static apps/web/.next/static
COPY --from=builder /app/apps/web/public apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
