# CLAUDE.md — Arborisis (Repère FR)

Guide court orienté agents/développeurs francophones.  
Références principales : `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/INFRASTRUCTURE.md`.

---

## Contexte

Arborisis est un jeu de stratégie spatiale persistant (type OGame) avec identité organique.  
Monorepo Turborepo + npm workspaces.

---

## Structure

| Package           | Rôle                                                                |
| ----------------- | ------------------------------------------------------------------- |
| `packages/shared` | Source de vérité gameplay (enums, constantes, formules, Zod, types) |
| `apps/api`        | API NestJS, auth, moteur de jeu, BullMQ                             |
| `apps/web`        | Front Next.js, proxy `/api`, scènes 3D                              |
| `prisma`          | Schéma, migrations, seed                                            |

---

## Setup local

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

**Important :** PostgreSQL et Redis doivent être démarrés avant dev/tests/e2e.

---

## Invariants techniques

1. **Autorité serveur** : le client n’envoie que des intentions.
2. **Équilibrage centralisé** dans `packages/shared/src/constants.ts`.
3. **Enums synchronisés** entre `shared/enums.ts` et `prisma/schema.prisma`.
4. **Validation Zod stricte** sur toutes les entrées API.
5. **Idempotence** des finalisations BullMQ.

---

## Vérification (ordre CI)

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

---

## Railway (essentiel)

- API : `railway.toml`
- Web : `railway.web.toml` (à sélectionner explicitement dans Railway)
- Release phase API : migrations + seed via `preDeployCommand`
- Le web parle à l’API via `API_INTERNAL_URL` (réseau privé Railway)
