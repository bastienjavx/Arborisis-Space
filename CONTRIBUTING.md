# Contributing to Arborisis

This guide explains how to change Arborisis without breaking its multiplayer, persistent, server-authoritative model.

Read this with [README.md](./README.md), [Architecture](./docs/ARCHITECTURE.md), [Security](./SECURITY.md), and [Infrastructure](./docs/INFRASTRUCTURE.md).

---

## Prerequisites

- Node.js 22+
- npm 10+
- Docker
- PostgreSQL and Redis running locally through Docker Compose

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

Useful local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Health: `http://localhost:4000/api/health`
- Prisma Studio: `npm run db:studio`

---

## Development Principles

1. Keep gameplay authoritative on the server.
2. Put balance numbers, formulas, enums, schemas, and transport types in `packages/shared`.
3. Keep `packages/shared/src/enums.ts` synchronized with `prisma/schema.prisma`.
4. Validate every API input through the existing Zod validation pattern.
5. Use Prisma transactions for spend-and-schedule flows.
6. Make timed finalization replay-safe; BullMQ jobs and recovery sweeps can run more than once.
7. Keep app-layer code free of hidden gameplay constants.
8. Treat production deployment files as code. Railway config changes need review.

---

## Change Playbooks

### Add or Change Gameplay Balance

1. Update `packages/shared/src/constants.ts`.
2. Update formulas in `packages/shared/src/formulas.ts` if behavior changes.
3. Add or update focused shared tests.
4. Update API services only to consume shared values.
5. Update UI copy or affordances only after the server behavior is correct.

### Add a Gameplay Enum

1. Add the enum value to `packages/shared/src/enums.ts`.
2. Add the matching Prisma enum value in `prisma/schema.prisma`.
3. Create a Prisma migration.
4. Update schemas, constants, formulas, and UI mappings.
5. Add tests for serialization, persistence, and behavior.

### Add an API Mutation

1. Define the input schema in shared or the closest API module.
2. Validate with `ZodValidationPipe`.
3. Re-settle server state before reading or mutating time-based resources.
4. Use a transaction for any operation that spends resources and schedules future work.
5. Return transport-safe DTOs; do not leak persistence internals.
6. Add unit tests for the service and e2e coverage for the route when user-facing.

### Add a Timed Workflow

1. Persist the business job before scheduling BullMQ.
2. Store enough data to finalize from the database, not from trusted client state.
3. Make finalization idempotent.
4. Add a recovery sweep for overdue jobs.
5. Add the processor to the correct worker module.
6. Document any new queue name or worker role in [Infrastructure](./docs/INFRASTRUCTURE.md).

### Change the Database Schema

1. Update `prisma/schema.prisma`.
2. Generate and inspect the migration with `npm run db:migrate`.
3. Keep destructive changes backward-compatible unless a planned data migration exists.
4. Update seed data when required.
5. Run `npm run db:validate`, unit tests, and relevant e2e tests.

### Change Railway or Runtime Config

1. Update the relevant `railway*.toml` file.
2. Update `.env.example` when variables change.
3. Update [Infrastructure](./docs/INFRASTRUCTURE.md).
4. Verify the service does not inherit the wrong config-as-code file.

---

## Verification

Run the full sequence before merging broad changes:

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

For narrow changes, run the relevant subset during development, then the full sequence before a release or PR that touches shared contracts, Prisma, auth, workers, or deployment config.

---

## Testing Expectations

| Change type               | Minimum coverage                                      |
| ------------------------- | ----------------------------------------------------- |
| Shared constants/formulas | Shared unit tests                                     |
| API service logic         | Service unit tests                                    |
| API route behavior        | E2E route test when user-facing or security-sensitive |
| Prisma schema change      | Migration review plus affected service tests          |
| BullMQ workflow           | Finalization and replay/idempotency tests             |
| Web component             | Component test for logic-heavy UI                     |
| Security/auth/session     | Unit and e2e coverage for success and failure paths   |

Tests should prove behavior, not implementation trivia.

---

## Pull Request Checklist

- The change follows server-authoritative gameplay rules.
- Shared constants, formulas, schemas, and enums are updated when needed.
- Prisma migrations are included for schema changes.
- Timed jobs remain idempotent and recoverable.
- Environment variables and Railway config are documented when changed.
- Security-sensitive behavior has negative tests.
- The canonical verification sequence passes or failures are explained.
- No secrets, tokens, local `.env` values, generated private keys, or personal data are committed.

---

## Commit Style

Use small, descriptive commits. Good commit subjects describe the behavior:

```text
Add replay-safe market order expiry
Synchronize ship enum with Prisma schema
Document Railway worker config paths
```

Avoid mixing unrelated refactors with behavior changes.
