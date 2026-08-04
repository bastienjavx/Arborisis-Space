# Dockerfile multi-stage du front Arborisis (Next.js standalone).
# Construit depuis la RACINE du monorepo :  docker build -f docker/web.Dockerfile .

FROM node:22-bookworm-slim@sha256:813a7480f28fdadac1f7f5c824bcdad435b5bc1322a5968bbbdef8d058f9dff4 AS base
WORKDIR /app
ENV CI=true

# ── Dépendances + build ──
FROM base AS builder
# URL publique canonique. Next fige les métadonnées (SEO, Open Graph, canonical)
# des pages rendues statiquement au build : sans ces args, une installation
# auto-hébergée annonce le domaine par défaut. Laisser vide retombe sur le
# fallback de `apps/web/src/lib/site.ts`.
ARG SITE_URL=""
ARG NEXT_PUBLIC_SITE_URL=""
ENV SITE_URL=${SITE_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
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
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static apps/web/.next/static
COPY --from=builder --chown=node:node /app/apps/web/public apps/web/public

EXPOSE 3000
USER node
CMD ["node", "apps/web/server.js"]
