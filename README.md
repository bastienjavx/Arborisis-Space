# Arborisis — Organic Space Strategy MMO

**FR** — Jeu de stratégie spatiale multijoueur persistant, orienté civilisation organique.  
**EN** — Persistent multiplayer space strategy game built around an organic civilization fantasy.

Arborisis combines long-term empire building, asynchronous progression, and server-authoritative gameplay rules. It is inspired by classic browser strategy games while keeping its own identity (biological tech, spore expansion, living ecosystems).

---

## FR — Guide rapide

### 1) Ce que contient le monorepo

| Package           | Rôle                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `apps/api`        | API NestJS (auth, moteur de jeu, jobs BullMQ, sécurité)                     |
| `apps/web`        | Front Next.js (UI, proxy `/api`, scènes 3D React Three Fiber)               |
| `packages/shared` | Source de vérité gameplay (enums, constantes, formules, schémas Zod, types) |
| `prisma`          | Schéma DB, migrations, seed                                                 |

### 2) Démarrage local

Prérequis : **Node 22+**, **npm 10+**, **Docker**.

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

- Web : `http://localhost:3000`
- API : `http://localhost:4000`
- Health API : `GET /api/health`
- Compte démo : `demo@arborisis.test` / `arborisis-demo`

### 3) Commandes de référence (ordre CI)

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

### 4) Principes d’architecture non négociables

1. **Autorité serveur** : le client envoie des intentions, jamais des valeurs de confiance.
2. **Équilibrage centralisé** : toute mécanique chiffrée vit dans `packages/shared/src/constants.ts`.
3. **Validation systématique** : entrées validées via schémas Zod.
4. **Jobs idempotents** : finalisation BullMQ conçue pour être rejouable sans effet double.
5. **Enums synchronisés** : `packages/shared/src/enums.ts` doit rester aligné avec `prisma/schema.prisma`.

### 5) Déploiement Railway (vue d’ensemble)

- Deux services applicatifs : **API** (`railway.toml`) et **Web** (`railway.web.toml`).
- Le service web doit explicitement cibler `railway.web.toml` en config-as-code.
- Migrations + seed exécutés via **release phase** (`preDeployCommand`) côté API.
- Le web utilise `API_INTERNAL_URL` (réseau privé Railway) pour joindre l’API.

### 6) Documentation détaillée

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — workflow de contribution
- [`SECURITY.md`](./SECURITY.md) — modèle anti-triche et sécurité
- [`docs/INFRASTRUCTURE.md`](./docs/INFRASTRUCTURE.md) — infra, CI/CD, runbooks
- [`AGENTS.md`](./AGENTS.md) — guide compact pour agents
- [`CLAUDE.md`](./CLAUDE.md) — repère agent/développeur (FR)

---

## EN — Quick guide

### 1) Monorepo layout

| Package           | Purpose                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| `apps/api`        | NestJS API (auth, game engine, BullMQ jobs, security)                               |
| `apps/web`        | Next.js frontend (UI, `/api` proxy, React Three Fiber scenes)                       |
| `packages/shared` | Gameplay source of truth (enums, constants, formulas, Zod schemas, transport types) |
| `prisma`          | Database schema, migrations, seed                                                   |

### 2) Local setup

Requirements: **Node 22+**, **npm 10+**, **Docker**.

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `GET /api/health`
- Demo account: `demo@arborisis.test` / `arborisis-demo`

### 3) Canonical validation sequence (CI order)

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

### 4) Architecture guardrails

1. **Server authority**: clients submit intentions only.
2. **Centralized balance**: all numeric gameplay tuning lives in `packages/shared/src/constants.ts`.
3. **Strict validation**: inputs are validated with Zod.
4. **Idempotent jobs**: BullMQ completion paths are replay-safe.
5. **Enum synchronization**: `packages/shared/src/enums.ts` must mirror `prisma/schema.prisma`.

### 5) Railway deployment at a glance

- Two app services: **API** (`railway.toml`) and **Web** (`railway.web.toml`).
- Web service must be configured to use `/railway.web.toml`.
- Database migrations and seed run in API release phase (`preDeployCommand`).
- Web calls API through private network `API_INTERNAL_URL`.

### 6) Full documentation

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow
- [`SECURITY.md`](./SECURITY.md) — security model and anti-cheat rules
- [`docs/INFRASTRUCTURE.md`](./docs/INFRASTRUCTURE.md) — infrastructure, CI/CD, operations
- [`AGENTS.md`](./AGENTS.md) — compact agent reference
- [`CLAUDE.md`](./CLAUDE.md) — French-oriented developer/agent reference
