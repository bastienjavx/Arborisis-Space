# GitHub Copilot Instructions — Arborisis

Reference for agents working in this repository. See also `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `README.md`.

## What This Is

**Arborisis** is a browser-based persistent multiplayer space strategy game (OGame-like, organic civilization theme) built as a Turborepo monorepo with npm workspaces.

## Quick Start (Setup)

```bash
# One-time setup
cp .env.example .env
npm install
docker compose up -d postgres redis      # CRITICAL: Always start these first

# Database
npm run db:migrate
npm run db:seed                           # Demo: demo@arborisis.test / arborisis-demo

# Development
npm run dev                               # Starts API (port 4000) + web (port 3000)
```

**⚠️ Critical:** Docker services (PostgreSQL + Redis) must be running **before** dev server, tests, or e2e tests. Always verify with `docker compose ps` that both `postgres` and `redis` services are healthy before proceeding.

## Build, Test & Verification

```bash
# Full verification suite (matches CI order)
npm run build                # Turbo builds all workspaces
npm run lint                 # Turbo runs each workspace's lint (including web's next lint)
npm run format:check         # Prettier check
npm run typecheck            # Full TypeScript strict check
npm run test                 # Unit tests: shared + api + web
npm run test:e2e -w @arborisis/api   # E2E tests (requires DB + Redis)

# Quick checks during development
npm run build               # Fastest overall build
npm run lint -w @arborisis/web  # Lint web workspace (uses next/core-web-vitals config)
npm run format              # Auto-fix formatting with Prettier
npm run test -w @arborisis/api -- --testNamePattern="SpecificTest"  # Run one test in api workspace
```

**Note:** Turbo requires build dependencies to be in place. If `npm run build` fails with "turbo: command not found", run `npm install` first.

## Monorepo Structure

| Package           | Role                                                                                           | Entry           | Output                  |
| ----------------- | ---------------------------------------------------------------------------------------------- | --------------- | ----------------------- |
| `packages/shared` | **Source of truth:** gameplay enums, balance constants, formulas, Zod schemas, transport types | `src/index.ts`  | `dist/` (CommonJS)      |
| `apps/api`        | NestJS REST API, auth, game engine, BullMQ queue, health checks                                | `src/main.ts`   | `dist/` (nest build)    |
| `apps/web`        | Next.js 15 App Router, Tailwind dark theme, TanStack Query, React Three Fiber, Framer Motion   | `src/app/`      | `.next/`                |
| `prisma/`         | Database schema, migrations, seed script                                                       | `schema.prisma` | Generated Prisma client |

## Architecture Notes

### Server Authority & Validation

- **Client sends intentions only.** Never trust client-supplied resource values. Resources are recalculated server-side before any read/mutation via `GameEngineService.settlePlanet` and similar services.
- **Zod validation on every input.** All routes use `ZodValidationPipe` at the route level. Global `ValidationPipe` is **intentionally not installed** (no class-validator).
- See `SECURITY.md` for details on anti-cheat model.

### Balance & Game Logic

- **Balance constants live only in `packages/shared/src/constants.ts`** and are reused by both API and web.
- **Do not hardcode balance values in API or web code.** Always import from shared.
- Any change to gameplay formulas or constants requires updating both gameplay code and potentially migrations.

### Enum Synchronization (⚠️ Critical)

- **Prisma enums in `prisma/schema.prisma` MUST mirror `packages/shared/src/enums.ts`.**
- Any new enum value requires BOTH:
  1. Update in `packages/shared/src/enums.ts`
  2. Migration in `prisma/migrations/` with the same enum value added to `schema.prisma`
- Before committing enum changes, verify both files are in sync.

### Async Jobs & Finalization

- **BullMQ** handles timed game mechanics (resource accumulation, research completion, finalization).
- **Jobs are idempotent and lazy.** If a job doesn't run on time, it will recalculate on next read (`settlePlanet`) or during boot-time recovery sweep.
- Finalization is **idempotent** — safe to retry without side effects.

### API Client & Refresh Logic

- **`apps/web/src/lib/api.ts`** is the typed API client for the frontend.
- **Automatic 401 refresh:** When API returns 401, the client automatically refreshes the access token and retries the request.
- JWT access token: **15 minutes.** Rotating opaque refresh tokens stored in httpOnly cookies (SameSite=Lax).

### Next.js API Proxy

- **`/api` routes in Next.js proxy to NestJS**: Meta routes (auth, universes, health) use `API_INTERNAL_URL`. Other routes use the selected universe's `internalApiUrl` from the universe cookie (server-side only).
- **`NEXT_PUBLIC_*` variables used by client code are inlined at BUILD TIME**, not runtime. If you use a `NEXT_PUBLIC_*` variable in client code and change it in `.env`, you must rebuild the web app.
- During development (`npm run dev`), Next.js automatically proxies to the running NestJS API.

### React Three Fiber Scenes

- All 3D scenes live in `apps/web/src/components/three/`.
- **Loaded client-only** (`ssr: false`) to avoid SSR reconciler issues.
- The main game layout uses `export const dynamic = 'force-dynamic'` to opt out of full static generation.

### Web Tests

- `apps/web` uses **Jest + React Testing Library**.
- Test files are **co-located with components** (e.g., `Button.test.tsx` next to `Button.tsx`).

## Toolchain Quirks & Critical Warnings

### TypeScript & Incremental Builds

- **`apps/api/tsconfig.json` has `incremental: false`.** This is **required** because `nest build` wipes the `dist/` directory. With `incremental: true`, unchanged files (e.g., `common/`) would not be re-emitted after a wipe.
- **Do not re-enable incremental without first moving `.tsbuildinfo` into `dist/`.** Otherwise, the build cache will reference files that no longer exist.
- `packages/shared` has `composite: true` and builds to `dist/` as CommonJS, which is linked by both api and web via workspace link.

### ESLint & Formatting Configuration

- **Root ESLint config** (`.eslintrc.cjs`) explicitly ignores `apps/web/**` and only lints `packages/shared` and `apps/api`.
- **`apps/web` has its own ESLint config** (`.eslintrc.json`) extending `next/core-web-vitals`. However, `npm run lint` is a Turbo command that runs each workspace's lint script, so web IS linted as part of the full `npm run lint`.
- **Prettier** (`.prettierrc.json`): single quotes, trailing commas, printWidth 100. Always run `npm run format` before committing.
- **TypeScript strict everywhere**, plus `noUncheckedIndexedAccess` and `noImplicitOverride`.

### Prisma Enums & Migrations

- Prisma enums must always stay synchronized with `packages/shared/src/enums.ts`.
- When you add a new enum value, you need a Prisma migration that adds it to `schema.prisma`.
- The seed script (`prisma/seed.ts`) must remain **idempotent** — it should safely handle re-runs.

### CI Execution Order (GitHub Actions)

```
prisma generate
  ↓
prisma migrate deploy
  ↓
npm run build
  ↓
npm run lint
  ↓
npm run format:check
  ↓
npm run typecheck
  ↓
npm run test
  ↓
npm run test:e2e -w @arborisis/api
```

**If you modify the schema, migrations, or shared code, be aware CI runs in this specific order.**

## Deployment (Railway)

### Two Services

1. **API Service** (`railway.toml`, `docker/api.Dockerfile`)
   - Entry: `src/main.ts` via `nest build`
   - Environment: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `WEB_ORIGIN`, `NODE_ENV=production`
   - Pre-deploy: Release-phase `preDeployCommand` runs `prisma migrate deploy` and `prisma db seed` (uses `DIRECT_DATABASE_URL`)
   - Not public; only accessible via internal Railway network

2. **Web Service** (`railway.web.toml`, `docker/web.Dockerfile`)
   - Entry: Next.js app built in `apps/web`
   - Environment: `API_INTERNAL_URL` (points to private Railway API address; set this when deploying)
   - Public-facing service (user-accessible)
   - **⚠️ Critical:** Set the web service's **config file path** to `/railway.web.toml`. If it inherits `railway.toml` (API config), the build will fail looking for `DATABASE_URL`.

### Environment Variables

- **API:** Requires `DATABASE_URL`, `REDIS_URL`, `JWT_*_SECRET`, `WEB_ORIGIN`, `NODE_ENV`. During release phase, also uses `DIRECT_DATABASE_URL` for migrations/seed.
- **Web:** Requires `API_INTERNAL_URL` for internal API calls; no database access needed
- Migrations and seed script run as part of the release phase (via `preDeployCommand` in `railway.toml`), not app runtime startup

### Auto-Scaling (Universe Provisioning)

- When an active universe reaches `UNIVERSE_PROVISION_THRESHOLD` fraction of `maxPlayers` (default 0.9 = 90%), a new API node is auto-provisioned.
- New user registrations are assigned to the oldest non-full `ACTIVE` universe via `UniverseService.pickAvailableUniverse`.
- **Never hardcode the "default" universe**; always let the service pick an available one.

## Important Files & Patterns

| File                                                | Purpose                                     | Watch For                                                           |
| --------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `packages/shared/src/constants.ts`                  | All balance and gameplay constants          | Changes here affect both front and back; requires rebuild + testing |
| `packages/shared/src/enums.ts`                      | Game enums (research, building types, etc.) | Must mirror `prisma/schema.prisma`; new values need migrations      |
| `packages/shared/src/formulas.ts`                   | Pure gameplay formulas (tested)             | Import only; do not duplicate logic elsewhere                       |
| `apps/api/src/modules/game/game-engine.service.ts`  | Lazy resource settlement & authority        | Server-side recalculation of all player resources before mutations  |
| `apps/api/src/modules/game/finalization.service.ts` | Idempotent job finalization                 | Processes BullMQ jobs; designed to be retried safely                |
| `apps/web/src/lib/api.ts`                           | Typed API client with auto-refresh          | Handles 401 → refresh → retry automatically                         |
| `prisma/schema.prisma`                              | Database schema + Prisma enums              | Enums must match `shared/enums.ts`                                  |
| `.env.example`                                      | Environment template                        | Always keep in sync with required secrets                           |

## Git & Development Practices

- **Feature branches:** Name in kebab-case (e.g., `fix-icon-rendering`, `add-copilot-review`).
- **Commits:** Atomic, descriptive. Use present tense ("Add feature" not "Added feature").
- **PR titles:** Under 80 characters, clear intent (e.g., "Fix PWA icon rendering issues" not "Update web").
- **Before pushing:** Run `npm run format` to fix formatting; run `npm run lint && npm run typecheck` to catch errors early.

## Demo & Testing

- **Demo account** (seed): `demo@arborisis.test` / password `arborisis-demo`
- **API health check:** `GET http://localhost:4000/api/health`
- **Web:** `http://localhost:3000`

## Common Pitfalls

1. **Forgetting `docker compose up`** — Tests and dev server will fail silently without PostgreSQL and Redis.
2. **Modifying `.env` after building web** — `NEXT_PUBLIC_*` variables used by client code are baked in at build time; changes require `npm run build` in web.
3. **Changing enums without migrations** — Mismatched Prisma and shared enums cause type errors.
4. **Hardcoding balance values** — Always use `packages/shared/src/constants.ts`.
5. **Trusting client values** — Always recalculate server-side before mutations.
6. **Breaking incremental TypeScript** — Do not enable `incremental: true` in `apps/api` without relocating `.tsbuildinfo`.
7. **Running linters on web** — Use `npm run lint -w @arborisis/web` to lint the web workspace; it has its own ESLint config extending next/core-web-vitals.
8. **Mixing Railway configs** — Web service must use `railway.web.toml`, not `railway.toml`.

---

**For architectural deep dives, see `AGENTS.md` (English) and `CLAUDE.md` (French). For security & anti-cheat details, see `SECURITY.md`. For contributing guidelines, see `CONTRIBUTING.md`.**
