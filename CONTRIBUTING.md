# Contribuer à Arborisis

Merci de contribuer ! Ce guide décrit l'organisation du code et les attentes qualité.

## Prérequis

- Node 22+, npm 10+, Docker.
- Lire [`README.md`](./README.md) (démarrage) et [`SECURITY.md`](./SECURITY.md) (autorité serveur).

## Mise en route

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate && npm run db:seed
npm run dev
```

## Organisation

- **`packages/shared`** — Source de vérité du gameplay : enums, constantes d'équilibrage,
  **formules pures** (testées), schémas Zod. Toute mécanique chiffrée vit ici, jamais en dur
  dans l'API ou le front.
- **`apps/api`** — NestJS. Logique métier dans `modules/game` ; le `GameEngineService`
  recalcule les ressources, le `FinalizationService` finalise les jobs (idempotent).
- **`apps/web`** — Next.js. Le client **prévisualise** avec les formules partagées mais ne
  décide rien : l'API tranche.

## Règles d'or

1. **Autorité serveur** : ne jamais faire confiance à une valeur envoyée par le client.
   Ajouter les vérifications côté API et recalculer les ressources avant toute mutation.
2. **Équilibrage centralisé** : nouvelles valeurs → `packages/shared/src/constants.ts`,
   avec un test si une formule est ajoutée.
3. **Validation** : toute entrée HTTP passe par un schéma Zod (`packages/shared/src/schemas.ts`).
4. **Idempotence** : toute finalisation de job doit pouvoir s'exécuter plusieurs fois sans effet double.

## Avant d'ouvrir une PR

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api   # DB + Redis requis
npm run build
```

La CI (GitHub Actions) rejoue ces étapes. Une PR doit être verte.

Checks sécurité attendus sur PR :

- `Security / Scan de secrets (gitleaks)`
- `Security / Audit dépendances runtime`
- `Security / Scan Trivy (repo/config)`
- `CodeQL / Analyse CodeQL`
- `Dependency Review / Dependency Review (HIGH + CRITICAL bloquant)`

## Style

- TypeScript **strict** partout. Prettier (`npm run format`).
- Commits clairs et atomiques. Branches : `feat/...`, `fix/...`, `chore/...`.
- Migrations Prisma : `npm run db:migrate` puis **commiter** le dossier généré.

## Ajouter une mécanique (exemple : nouveau bâtiment)

1. Ajouter la valeur à `BuildingType` (`packages/shared/src/enums.ts`) **et** à l'enum
   Prisma (`prisma/schema.prisma`), puis migrer.
2. Décrire le bâtiment dans `BUILDINGS` (`constants.ts`).
3. Les formules, l'API et l'UI le prennent en charge automatiquement (itération sur les enums).
