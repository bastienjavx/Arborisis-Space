# CLAUDE.md — Arborisis

Repère pour agents/développeurs. Voir `README.md`, `CONTRIBUTING.md`, `SECURITY.md`.

## Quoi

Jeu de stratégie spatiale par navigateur, multijoueur, persistant (genre OGame, identité
propre : civilisations **organiques**). Monorepo Turborepo + npm workspaces.

## Structure

- `packages/shared` — **source de vérité du gameplay** : enums, constantes d'équilibrage
  (`constants.ts`), formules pures testées (`formulas.ts`), schémas Zod (`schemas.ts`),
  types de transport (`types.ts`). Construit en CommonJS vers `dist/`.
- `apps/api` — NestJS. Modules clés : `auth` (JWT cookies + argon2 + refresh rotatif),
  `game` (`GameEngineService` = calcul lazy des ressources, `FinalizationService` =
  finalisation idempotente, services planets/buildings/research/galaxy/colonization),
  `queue` (BullMQ : `GameQueueService` enfile, `ProcessorsModule` consomme), `health`.
- `apps/web` — Next.js 14 App Router, TailwindCSS sombre, TanStack Query. Client typé
  dans `src/lib/api.ts` (+ refresh-on-401), hooks `src/lib/queries.ts`.
- `prisma` — `schema.prisma`, `migrations/`, `seed.ts`.

## Commandes

```bash
npm install
docker compose up -d postgres redis      # données locales
npm run db:migrate && npm run db:seed
npm run dev                               # api (4000) + web (3000)

npm run build | lint | typecheck | test
npm run test:e2e -w @arborisis/api        # DB + Redis requis
```

Compte démo (seed) : `demo@arborisis.test` / `arborisis-demo`.
API préfixée `/api` ; health : `GET /api/health`.

## Principes non négociables

- **Autorité serveur** : le client n'envoie que des intentions. Ressources recalculées
  serveur (`GameEngineService.settlePlanet`) avant toute lecture/mutation ; jamais de
  valeur cliente de confiance. Voir `SECURITY.md`.
- **Équilibrage uniquement dans `packages/shared/constants.ts`** (réutilisé front + back).
- **Jobs temporisés idempotents** : BullMQ + finalisation paresseuse + balayage au boot.
- **Validation Zod** sur toute entrée. **Strict TypeScript** partout.

## Pièges connus

- `apps/api` : `incremental: false` dans `tsconfig.json` — nécessaire car `nest build`
  supprime `dist/` ; avec l'incrémental, des fichiers non modifiés n'étaient pas ré-émis
  (ex. `common/`). Ne pas réactiver sans déplacer `.tsbuildinfo` dans `dist/`.
- Les enums Prisma (`schema.prisma`) **dupliquent** ceux de `shared/enums.ts` :
  garder synchronisés (toute nouvelle valeur → migration).
- Validation par `ZodValidationPipe` au niveau des routes (pas de `ValidationPipe` global :
  `class-validator` n'est volontairement pas installé).
- `NEXT_PUBLIC_API_URL` est inliné au **build** du front.
- Migrations/seed prod : **release phase** (`preDeployCommand` dans `railway.toml`), pas dans
  `docker/entrypoint.sh` (qui ne fait que démarrer l'API). Le seed doit rester idempotent.
- Service web Railway : régler le **chemin de config** sur `/railway.web.toml` (sinon il hérite
  de `railway.toml` côté API et crashe sur `DATABASE_URL` absent).
- Auto-scaling univers : à `UNIVERSE_PROVISION_THRESHOLD` un node API est dupliqué via Railway.
  Les inscriptions choisissent l'univers `ACTIVE` non plein le plus ancien
  (`UniverseService.pickAvailableUniverse`), jamais l'univers `default` en dur.
