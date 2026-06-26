# AGENTS.md — Arborisis (Compact Operational Guide)

Primary quick-reference for coding agents working in this repository.

---

## Mission

Arborisis is a browser-based, persistent multiplayer space strategy game in a Turborepo monorepo.

---

## Fast setup

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

**Critical:** PostgreSQL + Redis must be running before dev, tests, or e2e.

---

## Monorepo boundaries

| Package           | Purpose                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| `packages/shared` | Source of truth: enums, balance constants, formulas, Zod schemas, transport types |
| `apps/api`        | NestJS API, auth, game engine, BullMQ, health                                     |
| `apps/web`        | Next.js App Router UI, API proxy, 3D scenes                                       |
| `prisma`          | Schema, migrations, seed                                                          |

---

## Non-negotiable architecture rules

1. **Server authority**: client sends intentions only.
2. **No hardcoded balance in app layers**: use `packages/shared/src/constants.ts`.
3. **Enum synchronization is mandatory** between shared enums and Prisma enums.
4. **Strict Zod validation** on API inputs.
5. **Idempotent timed finalization** across BullMQ workflows.

---

## Verification sequence

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

---

## Railway deployment essentials

- API service config: `railway.toml`
- Web service config: `railway.web.toml` (must be explicitly selected in Railway UI)
- API release phase runs migrations + seed via `preDeployCommand`
- Web calls API through `API_INTERNAL_URL` on private Railway network

---

## Source docs

- `README.md` (entry point)
- `CONTRIBUTING.md` (developer workflow)
- `SECURITY.md` (security model)
- `docs/INFRASTRUCTURE.md` (operations and CI/CD)
- `CLAUDE.md` (French reference)
