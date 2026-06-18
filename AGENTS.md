# AGENTS.md — Arborisis

Compact instruction file for OpenCode / agent sessions. See also `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`.

## What this is

Browser-based persistent multiplayer space strategy game (OGame-like, organic civ theme). Monorepo Turborepo + npm workspaces.

## Monorepo boundaries

| Package           | Role                                                                                            | Entry           | Build output                  |
| ----------------- | ----------------------------------------------------------------------------------------------- | --------------- | ----------------------------- |
| `packages/shared` | Gameplay source of truth: enums, balance constants, pure formulas, Zod schemas, transport types | `src/index.ts`  | `dist/` (CommonJS, composite) |
| `apps/api`        | NestJS REST API, auth, game engine, BullMQ queue                                                | `src/main.ts`   | `dist/` (nest build)          |
| `apps/web`        | Next.js 15 App Router, Tailwind dark theme, TanStack Query, React Three Fiber, Framer Motion    | `src/app/`      | `.next/`                      |
| `prisma/`         | Schema, migrations, seed script                                                                 | `schema.prisma` | generated client              |

## Exact commands

```bash
# Setup (one-time)
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate && npm run db:seed

# Dev
npm run dev                 # api (4000) + web (3000) via turbo

# Verification (CI order)
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test                # unit tests (shared + api + web)
npm run test:e2e -w @arborisis/api   # e2e; needs DB + Redis running
```

- Demo account (seed): `demo@arborisis.test` / `arborisis-demo`
- API health: `GET /api/health`
- API prefix: `/api`

## Architecture notes

- **Server authority**: client sends only intentions. Resources are lazily recalculated server-side (`GameEngineService.settlePlanet`) before any read/mutation. Never trust client values.
- **Balance lives only in `packages/shared/src/constants.ts`** — reused by both front and back.
- **Timed jobs** use BullMQ. Finalization is idempotent + lazy read-time fallback + boot-time recovery sweep.
- **Validation**: Zod on every input. `ZodValidationPipe` at route level; no global `ValidationPipe` (class-validator is intentionally not installed).
- **Auth**: JWT access (15 min) + opaque rotating refresh token per session, cookies httpOnly/SameSite=Lax. Argon2id for passwords.
- **Front API client**: `apps/web/src/lib/api.ts` handles typed requests + automatic refresh-on-401.
- **Next.js proxy**: `/api` routes proxy to NestJS via `API_INTERNAL_URL` (server-to-server). `NEXT_PUBLIC_API_URL` is inlined at **build time**.
- **3D scenes**: React Three Fiber scenes live in `apps/web/src/components/three/`. They are loaded client-only (`ssr: false`) to avoid SSR issues with the custom reconciler. The game layout uses `export const dynamic = 'force-dynamic'`.
- **Web tests**: `apps/web` uses Jest + React Testing Library. Test files are co-located with components (`*.test.tsx`).

## Toolchain quirks

- `apps/api/tsconfig.json` → `incremental: false` is **required** because `nest build` wipes `dist/`; with incremental enabled, unchanged files (e.g. `common/`) were not re-emitted. Do not re-enable without moving `.tsbuildinfo` into `dist/`.
- `packages/shared` builds to CommonJS (`dist/`) and is referenced by api/web via workspace link. Its `tsconfig.json` has `composite: true`.
- Prisma enums **mirror** `packages/shared/src/enums.ts`. Any new value needs both a shared enum update **and** a Prisma migration.
- CI order: `prisma generate` → `prisma migrate deploy` → `build` → `lint` → `format:check` → `typecheck` → `test` → `test:e2e`.
- E2E tests require running PostgreSQL + Redis (CI provides them via service containers; locally use `docker compose up -d postgres redis`).
- `apps/api` jest maps `@arborisis/shared` to the source file directly (`../../../packages/shared/src/index.ts`), not the built dist.

## Lint / style

- Root ESLint (`.eslintrc.cjs`) covers `packages/shared` and `apps/api` only. `apps/web` uses its own `apps/web/.eslintrc.json` extending `next/core-web-vitals`.
- Prettier config: `.prettierrc.json` (single quote, trailing comma, printWidth 100).
- TypeScript strict everywhere, plus `noUncheckedIndexedAccess` and `noImplicitOverride` from `tsconfig.base.json`.

## Deployment (Railway)

- Two services: API (`railway.toml`, `docker/api.Dockerfile`) and web (`railway.web.toml`, `docker/web.Dockerfile`).
- API needs `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEB_ORIGIN`, `NODE_ENV=production`. Runs `prisma migrate deploy` on startup.
- Web needs `API_INTERNAL_URL` pointing to the private Railway API address. Only the web service is public.
