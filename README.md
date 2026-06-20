# 🌿 Arborisis

Jeu de stratégie spatiale **par navigateur, multijoueur, persistant et asynchrone**.
Vous cultivez une **civilisation organique** dans une galaxie vivante : ressources
végétales, bâtiments biologiques, recherches, terraformation, essaimage de colonies,
flottes de combat, alliances et guerres de spores.

> Inspiré des grands codes du genre (type OGame) mais avec une identité propre :
> écologie spatiale, technologies organiques, expansion par les spores.

Le jeu est désormais une version enrichie : **3 races jouables**, **16 bio-vaisseaux**
avec des rôles de combat, support, transport et défense, **15 recherches**, un système
d'**alliances** complet, du **PvE** contre des anomalies galactiques et du **PvP**
(espionnage + raids) entre joueurs.

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
  JWT d'accès + sessions rotatives (cookies httpOnly), argon2, Helmet, rate limiting,
  logs pino et health check Terminus.
- **Frontend** : Next.js 15, TypeScript strict, TailwindCSS (thème sombre premium,
  mobile-first), TanStack Query, React Three Fiber pour les scènes spatiales.
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

- API directe : http://localhost:4000 (health : `/api/health`)
- Web : http://localhost:3000, avec proxy same-origin `/api` vers NestJS

### Stack complète en conteneurs

```bash
docker compose up --build
```

## Scripts

| Commande                             | Effet                                  |
| ------------------------------------ | -------------------------------------- |
| `npm run dev`                        | api + web en développement (Turbo)     |
| `npm run build`                      | build de tous les packages             |
| `npm run lint`                       | lint                                   |
| `npm run typecheck`                  | vérification de types                  |
| `npm run test`                       | tests unitaires (shared + api)         |
| `npm run test:e2e -w @arborisis/api` | tests e2e de l'API (DB + Redis requis) |
| `npm run db:migrate`                 | migrations (dev)                       |
| `npm run db:migrate:deploy`          | migrations (prod)                      |
| `npm run db:seed`                    | seed                                   |
| `npm run db:studio`                  | Prisma Studio                          |

## Boucle de jeu

1. Chaque joueur choisit une **race** (Mycélians, Photosynthex, Chitinids) avec des
   bonus de production, de vitesse ou de combat propres, puis démarre avec un **Noyau-Monde**.
2. Les **ressources** (Biomasse, Sève, Minéraux, Spores) s'accumulent dans le temps,
   bornées par le stockage et modulées par l'énergie (**Photosynthèse**), la
   **stabilité écologique**, la race et les recherches avancées.
3. On construit/améliore des **bâtiments** (file de construction temporisée).
4. On lance des **recherches** (empire-wide) : 15 technologies réparties entre économie,
   propulsion, militaire et renseignement.
5. Une fois la **Propulsion sporale** recherchée, on **essaime** vers un emplacement
   libre de la galaxie pour fonder une **colonie**.
6. Le **Berceau Orbital** produit **16 bio-vaisseaux** répartis en rôles
   (combat, transport, espionnage, défense, support). Certains vaisseaux sont exclusifs
   à une race.
7. Les flottes partent en **expédition**, en **raid PvE** contre des anomalies hostiles,
   ou en **mission PvP** pour espionner / piller d'autres joueurs.
8. Les **alliances** permettent de fédérer des joueurs, gérer des candidatures et
   coordonner des actions galactiques.

Équilibrage entièrement centralisé dans `packages/shared/src/constants.ts`.

## Modèle anti-triche

- **Le serveur est la seule autorité.** Le client n'envoie que des intentions
  (« construire X », « chercher Y », « essaimer en Z »).
- Les ressources sont **recalculées paresseusement** côté serveur à partir du dernier
  horodatage (`lastResourceUpdate`) et de la production — jamais d'après une valeur cliente.
- Toutes les minuteries passent par **BullMQ** ; la finalisation est **idempotente** et
  doublée d'une finalisation paresseuse à la lecture + d'un balayage de récupération au
  démarrage (robuste même si un worker tombe).
- Les dépenses et créations de jobs utilisent des transactions PostgreSQL sérialisables
  et des contraintes uniques partielles : deux requêtes concurrentes ne peuvent pas
  dépenser ou démarrer deux fois la même action.
- Validation **Zod** stricte de toutes les entrées, rate limiting, cookies httpOnly.
- Les expéditions utilisent un tirage cryptographique serveur (`0..9999`) dont la valeur,
  la version des règles, les gains et les pertes restent enregistrés dans le rapport.

### API principales

| Route                                     | Usage                                 |
| ----------------------------------------- | ------------------------------------- |
| `GET /api/fleets/:planetId`               | Inventaire et production active       |
| `POST /api/ships`                         | Lance une production de bio-vaisseaux |
| `GET/POST /api/expeditions`               | Liste ou lance une expédition         |
| `GET /api/expeditions/reports`            | Rapports persistants                  |
| `PATCH /api/expeditions/reports/:id/read` | Marque un rapport comme lu            |
| `GET/POST /api/alliances`                 | Rechercher / créer une alliance       |
| `GET /api/alliances/:id`                  | Détail d'une alliance                 |
| `POST /api/alliances/:id/apply`           | Postuler à une alliance               |
| `GET/PATCH /api/alliances/applications`   | Voir / traiter les candidatures       |
| `GET /api/pve/encounters`                 | Anomalies hostiles disponibles        |
| `POST /api/pve/encounters/:id/attack`     | Lancer un raid PvE                    |
| `GET /api/pve/missions`                   | Missions PvE actives                  |
| `POST /api/pvp/spy`                       | Espionner une planète ennemie         |
| `POST /api/pvp/attack`                    | Attaquer une planète ennemie          |
| `GET /api/pvp/missions`                   | Missions PvP actives                  |

Détails dans [`SECURITY.md`](./SECURITY.md).

## Tests

```bash
docker compose up -d postgres redis
npm run db:migrate
npm run test                          # unitaires (formules, auth)
npm run test:e2e -w @arborisis/api    # parcours auth + planète + construction
```

## Déploiement Railway

Le projet Railway comporte PostgreSQL, Redis, `api` et `web` (plus les nodes `univers-N`
auto-provisionnés). `railway.toml` configure l'API ; le service web doit pointer son
**chemin de config** sur `/railway.web.toml` (Settings → Config-as-code). Seul le web est
public ; définir `API_INTERNAL_URL` sur le web avec l'adresse privée Railway de l'API, et
`WEB_ORIGIN` sur l'API avec l'URL publique du web.

**Migrations & seed** : exécutés une seule fois par déploiement via la _release phase_
(`preDeployCommand` dans `railway.toml`), pas au boot des réplicas. Le seed est idempotent.

**CD (intégration GitHub native)** : connecter les services `api` et `web` au dépôt avec
auto-deploy sur `main`. La CI GitHub Actions (`.github/workflows/ci.yml`) sert de **garde** :
protéger `main` (Settings → Branches) en exigeant le check `build-and-test`. Aucun token
Railway n'est stocké dans GitHub. Rollback : dashboard Railway → service → déploiement
précédent → _Redeploy_.

**Auto-scaling à saturation** : chaque univers est plafonné à `UNIVERSE_MAX_PLAYERS` (500).
À 90 % de remplissage (`UNIVERSE_PROVISION_THRESHOLD`), l'API duplique le service `api` en
un nouveau node via l'API Railway (`UNIVERSE_PROVISIONING_ENABLED=true` +
`RAILWAY_API_TOKEN`/`RAILWAY_PROJECT_ID`/`RAILWAY_SERVICE_TEMPLATE_ID`). Le node ne devient
`ACTIVE` (et n'accueille de joueurs) qu'une fois son déploiement sain. Un réconciliateur
périodique garantit qu'il reste toujours de la capacité d'accueil même si un job échoue.

**Un seul domaine public** : les nodes `univers-N` n'ont **pas** de domaine — seul le
service `web` est exposé. Le joueur reste sur le domaine du site ; le proxy web route
chaque univers vers son node en **réseau privé Railway** via l'`internalApiUrl` stocké dans
le cookie d'univers (`http://univers-<slug>.railway.internal:4000`). Chaque node force donc
`PORT=4000` pour une adresse privée déterministe.

## Sécurité

Politique et bonnes pratiques : [`SECURITY.md`](./SECURITY.md).
Contribution : [`CONTRIBUTING.md`](./CONTRIBUTING.md).
