# 🌿 Arborisis

Jeu de stratégie spatiale **par navigateur, multijoueur, persistant et asynchrone**.
Vous cultivez une **civilisation organique** dans une galaxie vivante : ressources
végétales, bâtiments biologiques, recherches, terraformation et essaimage de colonies.

> Inspiré des grands codes du genre (type OGame) mais avec une identité propre :
> écologie spatiale, technologies organiques, expansion par les spores.

Ceci est le **MVP** : une tranche verticale jouable, server-authoritative (anti-triche),
testée, dockerisée et déployable sur Railway.

---

## Sommaire

- [Architecture](#architecture)
- [Stack](#stack)
- [Démarrage rapide](#démarrage-rapide)
- [Scripts](#scripts)
- [Boucle de jeu](#boucle-de-jeu)
- [Modèle anti-triche](#modèle-anti-triche)
- [Tests](#tests)
- [Déploiement Railway](#déploiement-railway)
- [Sécurité](#sécurité)

---

## Architecture

Monorepo **Turborepo + npm workspaces** :

```
apps/
  api/      NestJS — API REST, auth, moteur de jeu, files BullMQ
  web/      Next.js — interface de jeu (App Router, TailwindCSS, TanStack Query)
packages/
  shared/   Enums, constantes d'équilibrage, formules pures, schémas Zod (front ↔ back)
prisma/     Schéma, migrations, seed
docker/     Dockerfiles api & web (multi-stage)
.github/    CI GitHub Actions
```

Le package `@arborisis/shared` est la **source de vérité commune** : les mêmes formules
et schémas servent au serveur (autorité) et au client (prévisualisation).

## Stack

- **Backend** : Node 22, TypeScript strict, NestJS, PostgreSQL + Prisma, Redis + BullMQ,
  JWT (cookies httpOnly) + argon2, Helmet, rate limiting, logs pino, health check Terminus.
- **Frontend** : Next.js 14, TypeScript strict, TailwindCSS (thème sombre premium,
  mobile-first), TanStack Query.
- **DevOps** : Docker, docker-compose, Railway, GitHub Actions, migrations Prisma.

## Démarrage rapide

Prérequis : **Node 22+**, **npm 10+**, **Docker**.

```bash
# 1. Variables d'environnement
cp .env.example .env
#    (générer de vrais secrets : openssl rand -base64 48)

# 2. Dépendances
npm install

# 3. Données locales (PostgreSQL + Redis)
docker compose up -d postgres redis

# 4. Base de données
npm run db:migrate      # applique les migrations
npm run db:seed         # compte démo : demo@arborisis.test / arborisis-demo

# 5. Lancer api + web (hot reload)
npm run dev
```

- API : http://localhost:4000 (préfixe `/api`, health : `/api/health`)
- Web : http://localhost:3000

### Stack complète en conteneurs

```bash
docker compose up --build
```

## Scripts

| Commande                  | Effet                                             |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | api + web en développement (Turbo)                |
| `npm run build`           | build de tous les packages                        |
| `npm run lint`            | lint                                              |
| `npm run typecheck`       | vérification de types                             |
| `npm run test`            | tests unitaires (shared + api)                    |
| `npm run test:e2e -w @arborisis/api` | tests e2e de l'API (DB + Redis requis) |
| `npm run db:migrate`      | migrations (dev)                                  |
| `npm run db:migrate:deploy` | migrations (prod)                               |
| `npm run db:seed`         | seed                                              |
| `npm run db:studio`       | Prisma Studio                                     |

## Boucle de jeu

1. Chaque joueur démarre avec un **Noyau-Monde**.
2. Les **ressources** (Biomasse, Sève, Minéraux, Spores) s'accumulent dans le temps,
   bornées par le stockage et modulées par l'énergie (**Photosynthèse**) et la
   **stabilité écologique**.
3. On construit/améliore des **bâtiments** (file de construction temporisée).
4. On lance des **recherches** (empire-wide) qui débloquent bonus et structures.
5. Une fois la **Propulsion sporale** recherchée, on **essaime** vers un emplacement
   libre de la galaxie pour fonder une **colonie**.

Équilibrage entièrement centralisé dans `packages/shared/src/constants.ts`.

## Modèle anti-triche

- **Le serveur est la seule autorité.** Le client n'envoie que des intentions
  (« construire X », « chercher Y », « essaimer en Z »).
- Les ressources sont **recalculées paresseusement** côté serveur à partir du dernier
  horodatage (`lastResourceUpdate`) et de la production — jamais d'après une valeur cliente.
- Toutes les minuteries passent par **BullMQ** ; la finalisation est **idempotente** et
  doublée d'une finalisation paresseuse à la lecture + d'un balayage de récupération au
  démarrage (robuste même si un worker tombe).
- Validation **Zod** stricte de toutes les entrées, rate limiting, cookies httpOnly.

Détails dans [`SECURITY.md`](./SECURITY.md).

## Tests

```bash
docker compose up -d postgres redis
npm run db:migrate
npm run test                          # unitaires (formules, auth)
npm run test:e2e -w @arborisis/api    # parcours auth + planète + construction
```

## Déploiement Railway

Voir [`railway.toml`](./railway.toml). Projet Railway recommandé : 4 services
(PostgreSQL, Redis, `api`, `web`). L'API applique `prisma migrate deploy` au démarrage.

## Sécurité

Politique et bonnes pratiques : [`SECURITY.md`](./SECURITY.md).
Contribution : [`CONTRIBUTING.md`](./CONTRIBUTING.md).
