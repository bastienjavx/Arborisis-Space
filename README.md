# Arborisis

Browser-based persistent multiplayer space strategy game, built around organic civilization, asynchronous progression, and server-authoritative simulation.

Arborisis is a Turborepo monorepo with a NestJS API, a Next.js web client, a shared gameplay package, Prisma migrations, Redis-backed BullMQ workers, and Railway deployment manifests. The project is designed like a live strategy service: clients send intentions, the server owns the game state, and timed gameplay is finalized through replay-safe workers.

---

## Highlights

- Persistent empire building with planets, fleets, research, buildings, production lines, crafting, markets, trade routes, quests, achievements, seasons, alliances, chat, PVE, PVP, events, and NPC systems.
- Server-authoritative game engine with Zod-validated API inputs and shared gameplay constants.
- Multi-service Railway topology: API, web, gameplay worker, provisioning worker, maintenance worker, Postgres, Redis, and auto-provisioned universe nodes.
- Redis-backed BullMQ workflows for construction, research, ship production, expeditions, combat, crafting, production lines, trade routes, market expiry, notifications, NPC ticks, and recovery sweeps.
- Strict security posture: Argon2id, rotating refresh tokens, httpOnly cookies, origin checks, throttling, Helmet, secret scanning, dependency review, CodeQL, Trivy, and OSSF Scorecard.

---

## Repository Map

| Path              | Purpose                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `apps/api`        | NestJS API, auth, game modules, WebSocket events, BullMQ processors, workers, health checks |
| `apps/web`        | Next.js App Router UI, `/api` proxy, universe routing, game surfaces, 3D scenes             |
| `packages/shared` | Source of truth for enums, constants, formulas, Zod schemas, transport types                |
| `prisma`          | Database schema, migrations, seed data                                                      |
| `docs`            | Architecture, infrastructure, audits, and operational documentation                         |
| `docker`          | Production Dockerfiles and entrypoint                                                       |
| `railway*.toml`   | Railway config-as-code for API, web, and dedicated worker services                          |

The key rule is simple: gameplay knowledge starts in `packages/shared`; persistence starts in `prisma`; application behavior lives in `apps/api`; presentation lives in `apps/web`.

---

## Quick Start

Requirements:

- Node.js 22+
- npm 10+
- Docker

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

Local services:

| Service    | URL                                |
| ---------- | ---------------------------------- |
| Web        | `http://localhost:3000`            |
| API        | `http://localhost:4000`            |
| API health | `http://localhost:4000/api/health` |

Demo account after seeding:

```text
demo@arborisis.test
arborisis-demo
```

PostgreSQL and Redis must be running before local dev, tests, e2e, or workers.

---

## Common Commands

| Command                              | Use                                               |
| ------------------------------------ | ------------------------------------------------- |
| `npm run dev`                        | Start all workspace dev processes through Turbo   |
| `npm run build`                      | Build all workspaces                              |
| `npm run lint`                       | Run lint checks                                   |
| `npm run format`                     | Format TypeScript, JavaScript, JSON, and Markdown |
| `npm run format:check`               | Check formatting                                  |
| `npm run typecheck`                  | Type-check all workspaces                         |
| `npm run test`                       | Run unit tests                                    |
| `npm run test:e2e -w @arborisis/api` | Run API e2e tests                                 |
| `npm run db:generate`                | Generate Prisma client                            |
| `npm run db:migrate`                 | Run local Prisma migrations                       |
| `npm run db:migrate:deploy`          | Apply production migrations                       |
| `npm run db:seed`                    | Seed local or release data                        |
| `npm run db:studio`                  | Open Prisma Studio                                |
| `npm run db:validate`                | Validate Prisma schema                            |

Canonical verification sequence:

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

---

## Architecture Rules

These are project invariants, not preferences:

1. Server authority: clients submit intentions only.
2. No hardcoded balance in app layers: numeric gameplay tuning belongs in `packages/shared/src/constants.ts`.
3. Shared and Prisma enums must stay synchronized.
4. API inputs must be validated with Zod.
5. Spend-and-schedule workflows must be transactional.
6. Timed finalization must be idempotent and safe to replay.
7. Workers must be deployable independently from HTTP API services.
8. Production secrets must never enter Git history.

See [Architecture](./docs/ARCHITECTURE.md) for module boundaries, runtime flows, and change playbooks.

---

## Documentation

| Document                                           | Audience                   | Contents                                                                     |
| -------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------- |
| [Architecture](./docs/ARCHITECTURE.md)             | Engineers and agents       | System map, domain modules, data flow, workers, invariants, change playbooks |
| [Contributing](./CONTRIBUTING.md)                  | Contributors               | Setup, branch workflow, testing expectations, PR checklist                   |
| [Security](./SECURITY.md)                          | Maintainers and reporters  | Disclosure, threat model, controls, CI security checks, incident handling    |
| [Infrastructure](./docs/INFRASTRUCTURE.md)         | Operators                  | Railway topology, environment variables, deploy flow, runbooks               |
| [Agent Guide](./AGENTS.md)                         | Coding agents              | Compact operational rules                                                    |
| [Claude Reference](./CLAUDE.md)                    | French agent/dev reference | Extended project guidance                                                    |
| [Visual Asset Audit](./docs/VISUAL_ASSET_AUDIT.md) | Product/design             | Asset quality notes                                                          |

---

## Deployment Snapshot

Railway services are separated by role:

| Service             | Config                             |
| ------------------- | ---------------------------------- |
| API                 | `railway.toml`                     |
| Web                 | `railway.web.toml`                 |
| Gameplay worker     | `railway.worker.gameplay.toml`     |
| Provisioning worker | `railway.worker.provisioning.toml` |
| Maintenance worker  | `railway.worker.maintenance.toml`  |

Important deployment constraints:

- The API release phase runs `prisma migrate deploy` and `prisma db seed`.
- The web service must explicitly select `/railway.web.toml` in Railway config-as-code.
- Worker services must explicitly select their `railway.worker.*.toml` files.
- Workers must not inherit `railway.toml`, otherwise they can run the API release phase incorrectly.
- The web calls the API through `API_INTERNAL_URL` on Railway private networking.

See [Infrastructure](./docs/INFRASTRUCTURE.md) for the full operational guide.

---

## License

© 2025 Arborisis. All rights reserved.

The source code is publicly visible for transparency and community reference. No license is granted to copy, modify, distribute, or run this software for commercial or competitive purposes without explicit written permission from the maintainers.
